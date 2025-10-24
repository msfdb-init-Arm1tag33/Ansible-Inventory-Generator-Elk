// Client-side logic: dynamic groups, hosts, roles, preview and generate
const groupsContainer = document.getElementById('groupsContainer');
const addGroupBtn = document.getElementById('addGroupBtn');
const generateBtn = document.getElementById('generateBtn');
const inventoryNameInput = document.getElementById('inventoryName');
const resultDiv = document.getElementById('result');
const resultMsg = document.getElementById('resultMsg');
const downloadLink = document.getElementById('downloadLink');

const yamlEditor = CodeMirror.fromTextArea(document.getElementById('yamlViewer'), {
  mode: 'yaml',
  lineNumbers: true,
  readOnly: true
});

const ES_GROUPS = ['master','hot','warm','cold','frozen'];
const OTHER_GROUPS = ['kibana','logstash','fleet-server','machine_learning','coordinator'];

const POSSIBLE_ROLES = [
  'master','data_content','data_hot','data_warm','data_cold','data_frozen','ingest','ml','coordinator'
];

function makeGroupElement(defaultName = '') {
  const g = document.createElement('div');
  g.className = 'group';
  g.innerHTML = `
    <h3>Grupo</h3>
    <div class="row"><input class="groupName" placeholder="Nome do grupo (ex: master)" value="${defaultName}"></div>
    <div class="hosts"></div>
    <div style="margin-top:8px">
      <button class="addHostBtn">+ Adicionar Host</button>
      <button class="removeGroupBtn">- Remover Grupo</button>
    </div>
  `;
  const addHostBtn = g.querySelector('.addHostBtn');
  const removeGroupBtn = g.querySelector('.removeGroupBtn');
  const hostsDiv = g.querySelector('.hosts');

  addHostBtn.addEventListener('click', () => {
    hostsDiv.appendChild(makeHostElement());
    updatePreview();
  });
  removeGroupBtn.addEventListener('click', () => {
    g.remove();
    updatePreview();
  });

  return g;
}

function makeHostElement() {
  const h = document.createElement('div');
  h.className = 'host';
  h.innerHTML = `
    <div style="display:flex;gap:8px">
      <input class="hostname" placeholder="Hostname (ex: master01)">
      <input class="hostip" placeholder="IP (ex: 192.168.252.151)">
      <button class="removeHostBtn">Remover</button>
    </div>
    <div class="roles"></div>
  `;

  const rolesDiv = h.querySelector('.roles');
  POSSIBLE_ROLES.forEach(r => {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" value="${r}"> ${r}`;
    rolesDiv.appendChild(lab);
  });

  h.querySelector('.removeHostBtn').addEventListener('click', () => {
    h.remove();
    updatePreview();
  });

  // update preview when inputs change
  h.querySelector('.hostname').addEventListener('input', updatePreview);
  h.querySelector('.hostip').addEventListener('input', updatePreview);
  rolesDiv.querySelectorAll('input').forEach(cb => cb.addEventListener('change', updatePreview));

  return h;
}

addGroupBtn.addEventListener('click', () => {
  groupsContainer.appendChild(makeGroupElement());
  updatePreview();
});

// add default groups
['master','hot','warm','cold','frozen','kibana','logstash','fleet-server','machine_learning','coordinator'].forEach(g => {
  const el = makeGroupElement(g);
  groupsContainer.appendChild(el);
});

// attach change listeners to group name and hosts to update preview
document.addEventListener('input', (e) => {
  if (e.target.matches('.groupName')) updatePreview();
});

function collectData() {
  const groups = [];
  document.querySelectorAll('.group').forEach(g => {
    const group_name = g.querySelector('.groupName').value.trim();
    const hosts = [];
    g.querySelectorAll('.host').forEach(h => {
      const hostname = h.querySelector('.hostname').value.trim();
      const ip = h.querySelector('.hostip').value.trim();
      const roles = Array.from(h.querySelectorAll('.roles input:checked')).map(cb => cb.value);
      if (hostname && ip) hosts.push({hostname, ip, roles});
    });
    if (group_name && hosts.length) groups.push({group_name, hosts});
  });
  return {inventory_name: inventoryNameInput.value.trim() || 'inventory', groups};
}

function buildInventoryObject(data) {
  const inv = {all:{children:{}}};
  data.groups.forEach(g => {
    const name = g.group_name;
    const hostsObj = {};
    g.hosts.forEach(h => {
      hostsObj[h.hostname] = {ansible_host: h.ip};
    });
    if (['master','hot','warm','cold','frozen'].includes(name)) {
      inv.all.children.elasticsearch = inv.all.children.elasticsearch || {children:{}};
      inv.all.children.elasticsearch.children[`${name}_nodes`] = {hosts: hostsObj};
    } else {
      inv.all.children[name] = {hosts: hostsObj};
    }
  });
  return inv;
}

function updatePreview() {
  const data = collectData();
  const inv = buildInventoryObject(data);
  const y = jsyaml.dump(inv);
  yamlEditor.setValue(y);
}

generateBtn.addEventListener('click', async () => {
  const data = collectData();
  if (!data.groups.length) {
    alert('Adicione pelo menos um grupo com hosts.');
    return;
  }
  try {
    const res = await fetch('/generate', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const json = await res.json();
    resultDiv.classList.remove('hidden');
    resultMsg.textContent = json.message;
    downloadLink.href = `/download/${data.inventory_name}/hosts.yml`;
    updatePreview();
  } catch (err) {
    alert('Erro ao gerar inventário: '+err);
  }
});

// initial preview
updatePreview();