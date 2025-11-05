// script.js — wizard controller
let currentStep = 1;
const maxStep = 7;

function setActiveStep(n){
  currentStep = n;
  for(let i=1;i<=maxStep;i++){
    document.getElementById(`step-${i}`).style.display = i===n ? '' : 'none';
    const head = document.querySelector(`.step[data-step="${i}"]`);
    head.classList.toggle('active', i===n);
  }
  document.getElementById('prevBtn').disabled = n===1;
  document.getElementById('nextBtn').disabled = n===maxStep;
  updatePreviewArea();
}

document.getElementById('prevBtn').addEventListener('click', ()=> setActiveStep(currentStep-1));
document.getElementById('nextBtn').addEventListener('click', ()=> setActiveStep(currentStep+1));

// save step button
document.getElementById('saveStepBtn').addEventListener('click', async ()=>{
  try{
    if(currentStep===1) await saveInventoryStep();
    else if(currentStep===2) await saveAllVars();
    else if(currentStep===3) await saveEsVars();
    else if(currentStep===4) await saveKibanaVars();
    else if(currentStep===5) await saveFleetVars();
    else if(currentStep===6) await saveLogstashVars();
    else if(currentStep===7) await saveVaultVars();
    else alert('Step não tratado');
    updatePreviewArea();
    alert('Salvo com sucesso');
  }catch(e){
    alert('Erro: ' + (e.message || e));
  }
});

// helpers to add groups/hosts/vars in DOM
function createInputRow(key='', value=''){
  const div = document.createElement('div');
  div.className='var-field';
  div.innerHTML = `<input class="var-key" placeholder="nome" value="${key}"> <input class="var-value" placeholder="valor" value="${value}"> <button class="remove-btn" onclick="this.parentNode.remove()">Remover</button>`;
  return div;
}

// groups and host functions
function createGroupElement(){
  const container = document.createElement('div');
  container.className='group-block';
  container.innerHTML = `
    <label>Nome do grupo</label>
    <input class="groupName" placeholder="ex: master_nodes">
    <div class="hostsContainer"></div>
    <button class="add-btn" onclick="(function(b){ const hosts = b.parentNode.querySelector('.hostsContainer'); hosts.appendChild(createHostEl()); })(this)">+ Host</button>
  `;
  return container;
}
function createHostEl(){
  const h = document.createElement('div');
  h.className='host-block';
  h.innerHTML = `<div class="row"><input class="hostname" placeholder="hostname"><input class="hostip" placeholder="ip"><button class="remove-btn" onclick="this.parentNode.parentNode.remove()">Remover host</button></div>
    <div class="roles">${createRoleCheckboxes()}</div>`;
  return h;
}
function createRoleCheckboxes(){
  const roles = ["master","data_content","ingest","data_hot","data_warm","data_cold","data_frozen","ml","coordinator"];
  return roles.map(r=>`<label style="margin-right:6px"><input type="checkbox" value="${r}"> ${r}</label>`).join('');
}

function addGroup(containerId){
  document.getElementById(containerId).appendChild(createGroupElement());
}

// ---------- Render defaults helper ----------
function renderDefaults(containerId, defaults) {
  const container = document.getElementById(containerId);
  if (!container) return;
  for (const [k, v] of Object.entries(defaults)) {
    const el = createInputRow(k, v);
    container.appendChild(el);
  }
}

// populate initial defaults
(function init(){
  // default a group per section so user sees something
  addGroup('dataNodesContainer'); // Add one data node group by default

  // defaults for all vars
  const allDefaults = {
  // Users
  mgmt_user: 'ansible-mgmt',

  // Disk configuration
  elastic_mount_point: '/var/lib/elasticsearch',

  // URLs
  elasticsearch_url: "https://{{ hostvars[groups['master_nodes'][0]]['ansible_host'] }}:9200",
  kibana_url: "https://{{ kibana_ip }}:5601",
  fleet_server_url: "https://{{ hostvars[groups['fleet_server'][0]]['ansible_host'] }}:8220",

  // IPs
  kibana_ip: "{{ hostvars[groups['kibana'][0]]['ansible_host'] }}",

  // Users
  elastic_user: 'elastic',

  // Versões
  elastic_version: '8.19.5',
  elastic_agent_version: '8.19.5',
  elastic_agent_package: 'elastic-agent-{{ elastic_agent_version }}-linux-x86_64.tar.gz',

  // Diretórios
  agent_install_dir: '/tmp',
  home_directory_ansible: 'lrodrigues',
  fleet_cert_dir: '/etc/fleet-server/certs',

  // Policy e tokens
  policy_name: 'fleet-server-policy-testing',
  policy_namespace: 'default',
  policy_description: 'Policy fleet criada via API pelo Ansible',
  service_token_name: "fleet_token_{{ inventory_hostname | regex_replace('[^A-Za-z0-9_]', '_') }}_{{ lookup('pipe', 'date +%Y%m%d%H%M%S') }}",

  // Policy dos agents comuns
  policy_name_agent: 'linux-agent-policy',
  policy_namespace_agent: 'default',
  policy_description_agent: 'Policy agent criada via API pelo Ansible',

  // Metadata
  nome_fleet_server: 'fleet-server',
  kibana_server_name: 'kibana01',

  // Certificados e CA
  nome_do_ca: 'elastic-stack-ca.p12',
  nome_do_ca_pem: 'elastic-stack-ca.pem',
  nome_crt_ca: 'elastic-stack-ca.crt',
  nome_key_ca: 'elastic-stack-ca.key',
  nome_do_cert_elastic: 'elastic-certificate.p12',
  elastic_cert_path: '/etc/elasticsearch/certs',

  // Opções de cluster
  single_node: false,
  new_cluster: true,
  usar_ca_existente: false
};
  // defaults for elasticsearch (separate container)
  const elasticDefaults = {
    elasticsearch_config_dir: '/etc/elasticsearch'
  };
  // defaults for kibana (separate container)
  const kibanaDefaults = {
    kibana_version: '8.19.3',
    kibana_install_dir: '/usr/share/kibana',
    kibana_config_dir: '/etc/kibana',
    kibana_server_name: 'kibana-server'
  };
  // defaults for fleet (separate container)
  const fleetDefaults = {
    fleet_server_port: '8220',
    fleet_cert_dir: '/etc/fleet-server/certs',
    fleet_server_cert: '/etc/fleet-server/certs/fleet-server.crt',
    fleet_server_key: '/etc/fleet-server/certs/fleet-server.key',
    ca_cert_path: '/etc/fleet-server/certs/elastic-stack-ca.crt'
  };

  // defaults for fleet (separate container)
  const logstashDefaults = {
    logstash_version: '8.19.3',
    logstash_install_dir: '/usr/share/logstash',
    logstash_config_dir: '/etc/logstash'
  };

    // defaults for fleet (separate container)
  const vaultDefaults = {
    cert_password: '5ED4swayeD3So6rucHat',
    elastic_password: 'password',
    kibana_password: 'password',
    logstash_password: 'password'
  };

  // render defaults into their respective containers
  renderDefaults('allVarsContainer', allDefaults);
  renderDefaults('esVarsContainer', elasticDefaults);
  renderDefaults('kibanaVarsContainer', kibanaDefaults);
  renderDefaults('fleetVarsContainer', fleetDefaults);
  renderDefaults('logstashVarsContainer', logstashDefaults);
  renderDefaults('vaultVarsContainer', vaultDefaults);

  // containers for other steps
  document.getElementById('addEsVar').addEventListener('click', ()=> document.getElementById('esVarsContainer').appendChild(createInputRow()));
  document.getElementById('addKibanaVar').addEventListener('click', ()=> document.getElementById('kibanaVarsContainer').appendChild(createInputRow()));
  document.getElementById('addFleetVar').addEventListener('click', ()=> document.getElementById('fleetVarsContainer').appendChild(createInputRow()));
  document.getElementById('addLogstashVar').addEventListener('click', ()=> document.getElementById('logstashVarsContainer').appendChild(createInputRow()));
  document.getElementById('addVaultVar').addEventListener('click', ()=> document.getElementById('vaultVarsContainer').appendChild(createInputRow()));

  setActiveStep(1);
})();

// collect DOM fields helpers
function collectGroups(containerId){
  const groups = [];
  document.querySelectorAll(`#${containerId} .group-block`).forEach(g=>{
    const group_name = g.querySelector('.groupName').value.trim();
    const hosts = [];
    g.querySelectorAll('.host-block').forEach(h=>{
      const hostname = h.querySelector('.hostname').value.trim();
      const ip = h.querySelector('.hostip').value.trim();
      const roles = Array.from(h.querySelectorAll('.roles input:checked')).map(i=>i.value);
      if(hostname && ip) hosts.push({hostname, ip, roles});
    });
    if(group_name && hosts.length) groups.push({group_name, hosts});
  });
  return groups;
}
function collectVars(containerId){
  const vars = {};
  document.querySelectorAll(`#${containerId} .var-field`).forEach(r=>{
    const key = r.querySelector('.var-key').value.trim();
    const value = r.querySelector('.var-value').value;
    if(key) vars[key] = parseValue(value);
  });
  // also support inputs created from createInputRow may have no classes (from default creation)
  Array.from(document.querySelectorAll(`#${containerId} input`)).forEach(inp=>{
    if(inp.classList.contains('var-key') || inp.classList.contains('var-value')) return;
  });
  return vars;
}
function parseValue(v){
  // convert booleans and numbers if obvious
  if(v==='true') return true;
  if(v==='false') return false;
  if(/^[-+]?\d+$/.test(v)) return parseInt(v,10);
  if(/^[-+]?\d*\.\\d+$/.test(v)) return parseFloat(v);
  return v;
}

// SAVE functions that call API endpoints
async function saveInventoryStep(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  if(!inventory_name) throw new Error('inventory name required');
  const payload = {
    inventory_name,
    groups: {
      data_nodes: collectGroups('dataNodesContainer'),
      other_nodes: collectGroups('otherGroupsContainer')
    }
  };
  const res = await fetch('/api/generate_inventory', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload)});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

async function saveAllVars(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  if(!inventory_name) throw new Error('inventory name required');
  const vars = {};
  // collect specially from allVarsContainer where keys/values stored in .var-field elements
  document.querySelectorAll('#allVarsContainer .var-field').forEach(row=>{
    const key = row.querySelector('.var-key').value.trim();
    const value = row.querySelector('.var-value').value;
    if(key) vars[key] = parseValue(value);
  });
  const res = await fetch('/api/generate_all_vars', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({inventory_name, variables: vars})});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

async function saveEsVars(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  const vars = collectVars('esVarsContainer');
  const res = await fetch('/api/generate_elasticsearch_vars', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({inventory_name, variables: vars})});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

async function saveKibanaVars(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  const vars = collectVars('kibanaVarsContainer');
  const res = await fetch('/api/generate_kibana_vars', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({inventory_name, variables: vars})});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

async function saveFleetVars(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  const vars = collectVars('fleetVarsContainer');
  const res = await fetch('/api/generate_fleetserver_vars', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({inventory_name, variables: vars})});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

async function saveLogstashVars(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  const vars = collectVars('logstashVarsContainer');
  const res = await fetch('/api/generate_logstash_vars', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({inventory_name, variables: vars})});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

async function saveVaultVars(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  const vars = collectVars('vaultVarsContainer');
  const encrypt = document.getElementById('encryptVault').checked;
  const res = await fetch('/api/generate_all_vault', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({inventory_name, variables: vars, encrypt})});
  const j = await res.json();
  if(!res.ok) throw new Error(j.message || 'failed');
  return j;
}

// preview area will show hosts.yml and group_vars/all/all.yml (if exists)
async function updatePreviewArea(){
  const inventory_name = document.getElementById('inventoryName').value.trim();
  const preview = document.getElementById('previewArea');
  if(!inventory_name){
    preview.textContent = 'Preencha o nome do inventário para ver pré-visualização.';
    return;
  }
  // try to load hosts.yml and any group_vars created (backend writes them)
  try{
    const resp = await fetch(`/generated_preview?inventory_name=${encodeURIComponent(inventory_name)}`);
    if(!resp.ok){
      preview.textContent = 'Ainda não há arquivos gerados para este inventário.';
      return;
    }
    const j = await resp.json();
    // j can contain hosts, all, elasticsearch, kibana, fleet_server
    const text = [];
    if(j.hosts) text.push('--- hosts.yml ---\n' + jsYamlSafeDump(j.hosts));
    if(j.all) text.push('\n--- group_vars/all/all.yml ---\n' + jsYamlSafeDump(j.all));
    if(j.elasticsearch) text.push('\n--- group_vars/elasticsearch/elasticsearch.yml ---\n' + jsYamlSafeDump(j.elasticsearch));
    if(j.kibana) text.push('\n--- group_vars/kibana/kibana.yml ---\n' + jsYamlSafeDump(j.kibana));
    if(j.fleet_server) text.push('\n--- group_vars/fleet_server/fleet_server.yml ---\n' + jsYamlSafeDump(j.fleet_server));
    preview.textContent = text.join('\n');
  }catch(e){
    preview.textContent = 'Erro ao buscar preview: ' + e.message;
  }
}

function jsYamlSafeDump(obj){
  try { return jsyaml.dump(obj); } catch(e){ return String(obj); }
}

// endpoint for preview; implement server route to return YAML parsed files
// set interval to update preview when step changes
setInterval(()=>{ updatePreviewArea(); }, 3000);