from flask import Flask, render_template, request, jsonify
import os
import yaml

app = Flask(__name__)

# Diretório onde os inventários serão gerados
BASE_DIR = os.path.join(os.getcwd(), "generated_inventories")
os.makedirs(BASE_DIR, exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate_inventory():
    data = request.get_json()
    inventory_name = data.get("inventory_name", "inventario_padrao")
    groups = data.get("groups", [])

    inv_dir = os.path.join(BASE_DIR, inventory_name)
    host_vars_dir = os.path.join(inv_dir, "host_vars")

    os.makedirs(inv_dir, exist_ok=True)
    os.makedirs(host_vars_dir, exist_ok=True)

    inventory = {"all": {"children": {}}}

    for group in groups:
        group_name = group.get("group_name")
        hosts = group.get("hosts", [])
        if not group_name or not hosts:
            continue

        group_dict = {"hosts": {}}

        for host in hosts:
            hostname = host.get("hostname")
            ip = host.get("ip")
            roles = host.get("roles", [])

            # Adiciona host ao inventário
            group_dict["hosts"][hostname] = {"ansible_host": ip}

            # Cria host_vars/<hostname>.yml
            host_vars = {
                "node_role": roles if roles else [],
                "es_node_name": hostname
            }

            with open(os.path.join(host_vars_dir, f"{hostname}.yml"), "w") as hv:
                yaml.dump(host_vars, hv, sort_keys=False)

        # Adiciona grupo ao inventário
        inventory["all"]["children"][group_name] = group_dict

    # Cria hosts.yml
    hosts_path = os.path.join(inv_dir, "hosts.yml")
    with open(hosts_path, "w") as f:
        yaml.dump(inventory, f, sort_keys=False)

    return jsonify({"message": "Inventário gerado com sucesso!", "inventory": inventory})


if __name__ == "__main__":
    app.run(debug=True)