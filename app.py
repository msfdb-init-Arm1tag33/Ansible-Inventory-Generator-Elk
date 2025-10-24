from flask import Flask, render_template, request, send_file, jsonify
import os
import yaml

app = Flask(__name__)

BASE_DIR = "generated_inventories"
HOSTVARS_DIR = os.path.join(BASE_DIR, "host_vars")
os.makedirs(HOSTVARS_DIR, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    hosts = data.get("hosts", [])

    # Estrutura base YAML
    inventory = {
        "all": {
            "children": {
                "elasticsearch": {"children": {}},
                "kibana": {"hosts": {}},
                "logstash": {"hosts": {}},
                "fleet-server": {"hosts": {}},
                "machine_learning": {"hosts": {}},
                "coordinator": {"hosts": {}}
            }
        }
    }

    # Limpa host_vars antes de gerar
    for f in os.listdir(HOSTVARS_DIR):
        os.remove(os.path.join(HOSTVARS_DIR, f))

    for h in hosts:
        name = h.get("name")
        ip = h.get("ip")
        node_type = h.get("type")
        roles = h.get("roles", [])

        # Adiciona host ao inventário
        if node_type in ["master", "hot", "warm", "cold", "frozen"]:
            child_group = f"{node_type}_nodes"
            inventory["all"]["children"]["elasticsearch"]["children"].setdefault(child_group, {"hosts": {}})
            inventory["all"]["children"]["elasticsearch"]["children"][child_group]["hosts"][name] = {
                "ansible_host": ip
            }
        else:
            inventory["all"]["children"].setdefault(node_type, {"hosts": {}})
            inventory["all"]["children"][node_type]["hosts"][name] = {
                "ansible_host": ip
            }

        # Cria host_vars/<hostname>.yml
        hostvar_path = os.path.join(HOSTVARS_DIR, f"{name}.yml")
        host_vars_content = {"es_node_name": name}
        if roles:
            host_vars_content["node_role"] = roles

        with open(hostvar_path, "w") as hv:
            yaml.dump(host_vars_content, hv, sort_keys=False)

    # Salva inventário principal
    inventory_path = os.path.join(BASE_DIR, "hosts.yml")
    with open(inventory_path, "w") as f:
        yaml.dump(inventory, f, sort_keys=False)

    return jsonify({"filename": "hosts.yml"})

@app.route("/download/<filename>")
def download(filename):
    path = os.path.join(BASE_DIR, filename)
    return send_file(path, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)