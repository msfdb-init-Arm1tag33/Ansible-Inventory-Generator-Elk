from flask import Flask, render_template, request, jsonify, send_file
import os
import yaml
import io
import zipfile

app = Flask(__name__)

BASE_DIR = os.path.join(os.getcwd(), "generated_inventories")
os.makedirs(BASE_DIR, exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/variables")
def variables():
    return render_template("all_variables.html")


@app.route("/generate", methods=["POST"])
def generate_inventory():
    data = request.get_json()
    inventory_name = data.get("inventory_name", "inventario_padrao")

    groups_data = {
        "data_nodes": data.get("data_nodes", []),
        "kibana": data.get("kibana", []),
        "logstash": data.get("logstash", []),
        "fleet": data.get("fleet", [])
    }

    inv_dir = os.path.join(BASE_DIR, inventory_name)
    host_vars_dir = os.path.join(inv_dir, "host_vars")

    os.makedirs(inv_dir, exist_ok=True)
    os.makedirs(host_vars_dir, exist_ok=True)

    # Estrutura inicial
    inventory = {"all": {"children": {"elasticsearch": {"children": {}}}}}

    # --- Data Nodes (dentro de elasticsearch)
    for group in groups_data["data_nodes"]:
        group_name = group.get("group_name")
        hosts = group.get("hosts", [])
        if not group_name or not hosts:
            continue

        group_dict = {"hosts": {}}
        for host in hosts:
            hostname = host.get("hostname")
            ip = host.get("ip")
            roles = host.get("roles", [])
            group_dict["hosts"][hostname] = {"ansible_host": ip}

            host_vars = {
                "node_role": roles if roles else [],
                "es_node_name": hostname
            }
            with open(os.path.join(host_vars_dir, f"{hostname}.yml"), "w") as hv:
                yaml.dump(host_vars, hv, sort_keys=False)

        inventory["all"]["children"]["elasticsearch"]["children"][group_name] = group_dict

    # --- Kibana, Logstash, Fleet
    for section in ["kibana", "logstash", "fleet"]:
        section_groups = groups_data[section]
        for group in section_groups:
            group_name = group.get("group_name") or section
            hosts = group.get("hosts", [])
            if not hosts:
                continue

            group_dict = {"hosts": {}}
            for host in hosts:
                hostname = host.get("hostname")
                ip = host.get("ip")
                group_dict["hosts"][hostname] = {"ansible_host": ip}

                host_vars = {"es_node_name": hostname}
                with open(os.path.join(host_vars_dir, f"{hostname}.yml"), "w") as hv:
                    yaml.dump(host_vars, hv, sort_keys=False)

            inventory["all"]["children"][section] = group_dict

    # Salvar hosts.yml
    hosts_path = os.path.join(inv_dir, "hosts.yml")
    with open(hosts_path, "w") as f:
        yaml.dump(inventory, f, sort_keys=False)

    return jsonify({"message": "Inventário gerado com sucesso!", "inventory": inventory})


@app.route('/generate_all_vars', methods=['POST'])
def generate_all_vars():
    vars_data = {k: v for k, v in request.form.items()}
    vars_yml = yaml.dump(vars_data, sort_keys=False, allow_unicode=True)

    mem_zip = io.BytesIO()
    with zipfile.ZipFile(mem_zip, 'w') as zf:
        zf.writestr("group_vars/all/all.yml", vars_yml)

    mem_zip.seek(0)
    return send_file(mem_zip, as_attachment=True, download_name="all_vars.zip")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
