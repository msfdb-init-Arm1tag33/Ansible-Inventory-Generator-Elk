from flask import Flask, render_template, request, send_file, jsonify
import os
import yaml

app = Flask(__name__)

GENERATED_ROOT = os.path.join(os.path.dirname(__file__), "generated_inventories")
os.makedirs(GENERATED_ROOT, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.get_json()
    inventory_name = data.get("inventory_name", "inventory")
    groups = data.get("groups", [])

    base_path = os.path.join(GENERATED_ROOT, inventory_name)
    hostvars_path = os.path.join(base_path, "host_vars")
    os.makedirs(hostvars_path, exist_ok=True)

    # Build inventory structure
    inventory = {"all": {"children": {}}}

    # Clean host_vars folder (remove previous files for this inventory)
    for f in os.listdir(hostvars_path):
        try:
            os.remove(os.path.join(hostvars_path, f))
        except Exception:
            pass

    for group in groups:
        group_name = group.get("group_name") or "ungrouped"
        hosts = group.get("hosts", [])

        # Ensure the parent structure for typical groups like elasticsearch children
        # We'll place ES-related groups under 'elasticsearch' as 'children' when appropriate
        es_related = ['master', 'hot', 'warm', 'cold', 'frozen']
        # Normalize group key names (e.g., master -> master_nodes)
        group_key = group_name
        if group_name.lower() in es_related:
            # put under elasticsearch -> children -> <group>_nodes
            parent = inventory["all"]["children"].setdefault("elasticsearch", {"children": {}})
            child_group = f"{group_name}_nodes"
            parent_children = parent["children"]
            parent_children.setdefault(child_group, {"hosts": {}})
            target = parent_children[child_group]["hosts"]
        else:
            # put at inventory all.children.<group_name>.hosts
            parent = inventory["all"]["children"]
            parent.setdefault(group_name, {"hosts": {}})
            target = parent[group_name]["hosts"]

        for h in hosts:
            hostname = h.get("hostname")
            ip = h.get("ip")
            roles = h.get("roles", []) or []

            if not hostname or not ip:
                continue

            target[hostname] = {"ansible_host": ip}

            # create host_vars file
            host_var = {"es_node_name": hostname}
            if roles:
                host_var["node_role"] = roles

            hv_file = os.path.join(hostvars_path, f"{hostname}.yml")
            with open(hv_file, 'w') as f:
                yaml.dump(host_var, f, sort_keys=False)

    # Write hosts.yml at base_path
    os.makedirs(base_path, exist_ok=True)
    hosts_yml_path = os.path.join(base_path, "hosts.yml")
    with open(hosts_yml_path, 'w') as f:
        yaml.dump(inventory, f, sort_keys=False)

    return jsonify({"message": f"Inventory '{inventory_name}' generated", "path": f"{inventory_name}/hosts.yml"})

@app.route('/download/<inventory>/<filename>')
def download(inventory, filename):
    path = os.path.join(GENERATED_ROOT, inventory, filename)
    if not os.path.exists(path):
        return "Not found", 404
    return send_file(path, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
