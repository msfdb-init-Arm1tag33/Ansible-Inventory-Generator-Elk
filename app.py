from flask import Flask, render_template, request, send_file, jsonify
import os
from datetime import datetime

app = Flask(__name__)
OUTPUT_DIR = "generated_inventories"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    group = data.get("group")
    hosts = data.get("hosts", [])

    # Monta o conteúdo do inventário
    inventory_content = f"[{group}]\n"
    for host in hosts:
        name = host.get("name")
        ip = host.get("ip")
        inventory_content += f"{name} ansible_host={ip}\n"

    # Nome do arquivo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{group}_{timestamp}.ini"
    filepath = os.path.join(OUTPUT_DIR, filename)

    # Salva o arquivo no servidor
    with open(filepath, "w") as f:
        f.write(inventory_content)

    return jsonify({"filename": filename})

@app.route("/download/<filename>")
def download(filename):
    filepath = os.path.join(OUTPUT_DIR, filename)
    return send_file(filepath, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
