const API_BASE = 'http://localhost:4000'; // change to your hosted backend URL when available
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('videoFile');
const statusEl = document.getElementById('status');
const downloadArea = document.getElementById('downloadArea');
const startInput = document.getElementById('start');
const durationInput = document.getElementById('duration');
const clearBtn = document.getElementById('clearBtn');

clearBtn.addEventListener('click', ()=>{
  fileInput.value = '';
  startInput.value = 0;
  durationInput.value = 15;
  statusEl.textContent = 'Status: idle';
  downloadArea.innerHTML = '';
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if(!fileInput.files.length) return alert('Choose a video file');
  const file = fileInput.files[0];
  const start = Number(startInput.value||0);
  const duration = Number(durationInput.value||15);

  statusEl.textContent = 'Status: uploading...';
  const fd = new FormData();
  fd.append('video', file);

  try{
    const up = await fetch(API_BASE + '/api/upload', { method: 'POST', body: fd });
    if(!up.ok) throw new Error('Upload failed — backend unreachable');
    const upj = await up.json();
    const jobId = upj.jobId || upj.id;
    statusEl.textContent = 'Status: uploaded — trimming...';

    // request trim
    const trim = await fetch(API_BASE + `/api/trim/${jobId}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ start, duration })
    });
    if(!trim.ok) throw new Error('Trim request failed');

    statusEl.textContent = 'Status: trimming started — polling...';
    const interval = setInterval(async ()=>{
      try{
        const s = await fetch(API_BASE + `/api/status/${jobId}`);
        if(!s.ok) throw new Error('Status request failed');
        const sj = await s.json();
        statusEl.textContent = 'Status: ' + (sj.status || 'unknown');
        if(sj.status === 'done' && sj.outputFile){
          clearInterval(interval);
          const dl = API_BASE + `/api/download/${jobId}`;
          downloadArea.innerHTML = `<div>Clip ready: <a class="link" href="${dl}" target="_blank">Download clip</a></div>`;
          statusEl.textContent = 'Status: done';
        } else if(sj.status === 'error'){
          clearInterval(interval);
          statusEl.textContent = 'Status: error - ' + (sj.error || 'see console');
        }
      }catch(err){
        clearInterval(interval);
        statusEl.textContent = 'Status: polling error';
        console.error(err);
      }
    }, 1500);

  }catch(err){
    console.error(err);
    statusEl.textContent = 'Status: error — ' + err.message;
    alert('Error: ' + err.message + '\nMake sure backend is running at ' + API_BASE);
  }
});
