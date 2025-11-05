from flask import Flask, render_template, request, jsonify, send_file
import os
import yaml
import io
import zipfile
import subprocess

app = Flask(__name__)

BASE_DIR = os.path.join(os.getcwd(), "generated_inventories")
os.makedirs(BASE_DIR, exist_ok=True)


@app.route("/")
def index():
    return render_template("index.html")


# --- Generate inventory (step 1) ---
@app.route("/api/generate_inventory", methods=["POST"])
def api_generate_inventory():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    groups_data = payload.get("groups", {})

    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400

    inv_dir = os.path.join(BASE_DIR, inventory_name)
    host_vars_dir = os.path.join(inv_dir, "host_vars")
    os.makedirs(host_vars_dir, exist_ok=True)

    # build inventory structure
    inventory = {"all": {"children": {"elasticsearch": {"children": {}}}}}

    # data nodes under elasticsearch
    for group in groups_data.get("data_nodes", []):
        gname = group.get("group_name")
        hosts = group.get("hosts", [])
        if not gname or not hosts:
            continue
        group_dict = {"hosts": {}}
        for h in hosts:
            name = h.get("hostname")
            ip = h.get("ip")
            roles = h.get("roles", [])
            if not name or not ip:
                continue
            group_dict["hosts"][name] = {"ansible_host": ip}
            host_vars = {"es_node_name": name}
            if roles:
                host_vars["node_role"] = roles
            with open(os.path.join(host_vars_dir, f"{name}.yml"), "w", encoding="utf-8") as hv:
                yaml.dump(host_vars, hv, sort_keys=False, allow_unicode=True)
        inventory["all"]["children"]["elasticsearch"]["children"][gname] = group_dict

    # other groups (kibana, logstash, fleet, etc) from a single list
    for group in groups_data.get("other_nodes", []):
        gname = group.get("group_name")
        hosts = group.get("hosts", [])
        if not gname or not hosts:
            continue
        group_dict = {"hosts": {}}
        for h in hosts:
            name = h.get("hostname")
            ip = h.get("ip")
            if not name or not ip:
                continue
            group_dict["hosts"][name] = {"ansible_host": ip}
            host_vars = {"es_node_name": name}
            with open(os.path.join(host_vars_dir, f"{name}.yml"), "w", encoding="utf-8") as hv:
                yaml.dump(host_vars, hv, sort_keys=False, allow_unicode=True)
        inventory["all"]["children"][gname] = group_dict

    # save hosts.yml
    os.makedirs(inv_dir, exist_ok=True)
    hosts_path = os.path.join(inv_dir, "hosts.yml")
    with open(hosts_path, "w", encoding="utf-8") as f:
        yaml.dump(inventory, f, sort_keys=False, allow_unicode=True)

    return jsonify({"ok": True, "message": f"hosts.yml and host_vars created at {inv_dir}", "inventory": inventory})


# --- Generic helper to save group_vars file inside inventory ---
def save_group_vars(inventory_name: str, group: str, filename: str, data: dict):
    if not inventory_name:
        raise ValueError("inventory_name required")
    base = os.path.join(BASE_DIR, inventory_name, "group_vars", group)
    os.makedirs(base, exist_ok=True)
    path = os.path.join(base, filename)
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, sort_keys=False, allow_unicode=True)
    return path


# --- Step 2: all.yml ---
@app.route("/api/generate_all_vars", methods=["POST"])
def api_generate_all_vars():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    variables = payload.get("variables", {})
    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400
    if not isinstance(variables, dict):
        return jsonify({"ok": False, "message": "variables must be a dict"}), 400
    path = save_group_vars(inventory_name, "all", "all.yml", variables)
    return jsonify({"ok": True, "message": f"all.yml saved at {path}", "path": path})


# --- Step 3: elasticsearch.yml ---
@app.route("/api/generate_elasticsearch_vars", methods=["POST"])
def api_generate_elasticsearch_vars():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    variables = payload.get("variables", {})
    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400
    path = save_group_vars(inventory_name, "elasticsearch", "elasticsearch.yml", variables)
    return jsonify({"ok": True, "message": f"elasticsearch.yml saved at {path}", "path": path})


# --- Step 4: kibana.yml ---
@app.route("/api/generate_kibana_vars", methods=["POST"])
def api_generate_kibana_vars():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    variables = payload.get("variables", {})
    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400
    path = save_group_vars(inventory_name, "kibana", "kibana.yml", variables)
    return jsonify({"ok": True, "message": f"kibana.yml saved at {path}", "path": path})


# --- Step 5: fleet_server.yml ---
@app.route("/api/generate_fleetserver_vars", methods=["POST"])
def api_generate_fleetserver_vars():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    variables = payload.get("variables", {})
    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400
    path = save_group_vars(inventory_name, "fleet_server", "fleet_server.yml", variables)
    return jsonify({"ok": True, "message": f"fleet_server.yml saved at {path}", "path": path})

# --- Step 6: logstash.yml ---
@app.route("/api/generate_logstash_vars", methods=["POST"])
def api_generate_logstash_vars():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    variables = payload.get("variables", {})
    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400
    path = save_group_vars(inventory_name, "logstash", "logstash.yml", variables)
    return jsonify({"ok": True, "message": f"logstash.yml saved at {path}", "path": path})

# --- Step 7 optional: create vault file and optionally encrypt it using ansible-vault if requested ---
@app.route("/api/generate_all_vault", methods=["POST"])
def api_generate_all_vault():
    payload = request.get_json() or {}
    inventory_name = payload.get("inventory_name", "").strip()
    variables = payload.get("variables", {})
    encrypt = bool(payload.get("encrypt", False))

    if not inventory_name:
        return jsonify({"ok": False, "message": "inventory_name is required"}), 400

    inv_all_dir = os.path.join(BASE_DIR, inventory_name, "group_vars", "all")
    os.makedirs(inv_all_dir, exist_ok=True)
    vault_path = os.path.join(inv_all_dir, "all_vault.yml")

    with open(vault_path, "w", encoding="utf-8") as f:
        yaml.dump(variables, f, sort_keys=False, allow_unicode=True)

    if encrypt:
        # try to encrypt with ansible-vault if available
        try:
            subprocess.run(["ansible-vault", "encrypt", vault_path], check=True)
            return jsonify({"ok": True, "message": f"all_vault.yml created and encrypted at {vault_path}", "path": vault_path})
        except FileNotFoundError:
            return jsonify({"ok": False, "message": "ansible-vault not found in PATH; file written plaintext", "path": vault_path}), 500
        except subprocess.CalledProcessError as e:
            return jsonify({"ok": False, "message": f"ansible-vault failed: {e}", "path": vault_path}), 500

    return jsonify({"ok": True, "message": f"all_vault.yml created at {vault_path}", "path": vault_path})

@app.route("/generated_preview")
def generated_preview():
    inventory_name = request.args.get("inventory_name", "").strip()
    if not inventory_name:
        return jsonify({"error":"inventory_name required"}), 400
    inv_dir = os.path.join(BASE_DIR, inventory_name)

    def load_yaml(path):
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            try:
                return yaml.safe_load(f)
            except Exception:
                return None

    hosts = load_yaml(os.path.join(inv_dir, "hosts.yml"))
    allv = load_yaml(os.path.join(inv_dir, "group_vars", "all", "all.yml"))
    esv = load_yaml(os.path.join(inv_dir, "group_vars", "elasticsearch", "elasticsearch.yml"))
    kibv = load_yaml(os.path.join(inv_dir, "group_vars", "kibana", "kibana.yml"))
    fleetv = load_yaml(os.path.join(inv_dir, "group_vars", "fleet_server", "fleet_server.yml"))
    logstashv = load_yaml(os.path.join(inv_dir, "group_vars", "logstash", "logstash.yml"))

    return jsonify({
        "hosts": hosts,
        "all": allv,
        "elasticsearch": esv,
        "kibana": kibv,
        "fleet_server": fleetv,
        "logstash": logstashv
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)