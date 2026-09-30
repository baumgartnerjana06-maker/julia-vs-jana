const SUPABASE_URL = "https://rlstjndrealqtrkfadxn.supabase.co";
const SUPABASE_KEY = "sb_publishable_hlBUdyFioH88CCdd69byqw_zLWcWVHi";

const state = {
  person: "julia",
  exercises: JSON.parse(localStorage.getItem("sgb_exercises") || "null") || [],
  logs: JSON.parse(localStorage.getItem("sgb_logs") || "[]"),
  supabase: null,
  editingId: null
};

const $ = id => document.getElementById(id);

function saveLocal(){
  localStorage.setItem("sgb_logs", JSON.stringify(state.logs));
  localStorage.setItem("sgb_exercises", JSON.stringify(state.exercises));
}
function qualifying(log){ return Number(log.sets) >= 3 && Number(log.reps) >= 8; }
function best(person, exercise){
  const xs = state.logs.filter(x => x.person === person && x.exercise === exercise && qualifying(x));
  return xs.length ? Math.max(...xs.map(x => Number(x.weight))) : null;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function render(){
  const select = $("exerciseSelect");
  select.innerHTML = state.exercises.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("") + `<option value="__new__">＋ Neue Übung…</option>`;
  if(!state.exercises.length) select.value = "__new__";

  const board = $("battleboard");
  board.innerHTML = state.exercises.length ? state.exercises.map(exercise => {
    const j = best("julia", exercise), n = best("jana", exercise);
    return `<article class="exercise-card">
      <div class="exercise-top"><span class="exercise-name">${escapeHtml(exercise)}</span><span class="exercise-note">bester Wert</span></div>
      <div class="compare">
        <div class="lift julia"><b>${j === null ? "—" : j + " kg"}</b><span>JULIA · 3×8+</span></div>
        <div class="arrow">↔</div>
        <div class="lift jana"><b>${n === null ? "—" : n + " kg"}</b><span>JANA · 3×8+</span></div>
      </div>
    </article>`;
  }).join("") : `<div class="empty-board"><strong>Noch keine Übungen.</strong><span>Tragt euer erstes Gewicht ein und die Übung erscheint hier.</span></div>`;

  const recent = [...state.logs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,12);
  $("history").innerHTML = recent.length ? recent.map(x => `
    <div class="history-item">
      <div class="history-main">
        <strong class="${x.person}-text">${x.person === "julia" ? "Julia" : "Jana"}</strong>
        <span>${escapeHtml(x.exercise)} · ${x.sets} × ${x.reps}${qualifying(x) ? " · zählt" : " · Training"}</span>
      </div>
      <div class="history-side">
        <div class="history-weight">${x.weight} kg</div>
        <div class="history-actions">
          <button class="text-btn edit-log" data-id="${x.id ?? x.created_at}">Bearbeiten</button>
          <button class="text-btn delete-log" data-id="${x.id ?? x.created_at}">Löschen</button>
        </div>
      </div>
    </div>`).join("") : `<p class="tiny">Noch keine Einträge.</p>`;

  document.querySelectorAll(".edit-log").forEach(btn => btn.addEventListener("click", () => startEdit(btn.dataset.id)));
  document.querySelectorAll(".delete-log").forEach(btn => btn.addEventListener("click", () => deleteLog(btn.dataset.id)));

  document.querySelectorAll(".person").forEach(b => b.classList.toggle("active", b.dataset.person === state.person));
  $("newExerciseWrap").classList.toggle("visible", select.value === "__new__");
}

async function syncLoad(){
  if(!state.supabase) return false;
  const {data,error}=await state.supabase.from("workout_logs").select("*").order("created_at",{ascending:false}).limit(500);
  if(error){
    console.error("Cloud load failed:", error);
    $("message").textContent="Cloud-Sync konnte nicht geladen werden.";
    return false;
  }
  state.logs=data || [];
  state.exercises=[...new Set(state.logs.map(x=>x.exercise))];
  saveLocal(); render();
  return true;
}
async function syncInsert(log){
  if(!state.supabase) return null;
  const payload={person:log.person,exercise:log.exercise,weight:log.weight,sets:log.sets,reps:log.reps,created_at:log.created_at};
  const {data,error}=await state.supabase.from("workout_logs").insert(payload).select().single();
  if(error){
    console.error("Cloud insert failed:", error);
    $("message").textContent="Nicht synchronisiert – bitte Internetverbindung prüfen.";
    return null;
  }
  return data;
}
async function syncUpdate(log){
  if(!state.supabase || !log.id) return false;
  const {error}=await state.supabase.from("workout_logs").update({
    person:log.person, exercise:log.exercise, weight:log.weight, sets:log.sets, reps:log.reps
  }).eq("id",log.id);
  if(error){ console.error(error); $("message").textContent="Änderung konnte nicht synchronisiert werden."; return false; }
  return true;
}
async function syncDelete(log){
  if(!state.supabase || !log.id) return false;
  const {error}=await state.supabase.from("workout_logs").delete().eq("id",log.id);
  if(error){ console.error(error); $("message").textContent="Löschen konnte nicht synchronisiert werden."; return false; }
  return true;
}
function findLog(key){
  return state.logs.find(x => String(x.id ?? x.created_at) === String(key));
}
function startEdit(key){
  const log=findLog(key); if(!log) return;
  state.editingId=key;
  state.person=log.person;
  render();
  $("exerciseSelect").value=log.exercise;
  $("newExerciseWrap").classList.remove("visible");
  $("weightInput").value=log.weight;
  $("setsInput").value=log.sets;
  $("repsInput").value=log.reps;
  $("logBtn").textContent="Änderung speichern";
  document.querySelector(".log-card").scrollIntoView({behavior:"smooth",block:"center"});
}
async function deleteLog(key){
  const log=findLog(key); if(!log) return;
  if(!confirm("Eintrag wirklich löschen?")) return;
  state.logs=state.logs.filter(x => x !== log);
  state.exercises=[...new Set(state.logs.map(x=>x.exercise))];
  saveLocal(); render();
  await syncDelete(log);
  $("message").textContent="Eintrag gelöscht.";
}

$("exerciseSelect").addEventListener("change",()=>{
  $("newExerciseWrap").classList.toggle("visible",$("exerciseSelect").value==="__new__");
});

$("logBtn").addEventListener("click",async()=>{
  const weight=Number($("weightInput").value), sets=Number($("setsInput").value), reps=Number($("repsInput").value);
  let exercise=$("exerciseSelect").value;
  if(exercise==="__new__" || !exercise){
    exercise=$("newExerciseInput").value.trim();
    if(!exercise){ $("message").textContent="Gebt der Übung zuerst einen Namen."; return; }
  }
  if(!weight || weight<0 || !sets || !reps){ $("message").textContent="Bitte Gewicht, Sets und Reps eintragen."; return; }

  if(!state.exercises.some(e=>e.toLowerCase()===exercise.toLowerCase())) state.exercises.push(exercise);
  const canonicalExercise=state.exercises.find(e=>e.toLowerCase()===exercise.toLowerCase());
  const previousBest=best(state.person,canonicalExercise);
  const otherPerson=state.person==="julia"?"jana":"julia";
  const otherBest=best(otherPerson,canonicalExercise);
  let log;
  if(state.editingId){
    log=findLog(state.editingId);
    if(!log) return;
    log.person=state.person; log.exercise=canonicalExercise; log.weight=weight; log.sets=sets; log.reps=reps;
    saveLocal(); render();
    await syncUpdate(log);
    state.editingId=null;
    $("logBtn").textContent="Eintragen 💪";
  } else {
    log={person:state.person,exercise:canonicalExercise,weight,sets,reps,created_at:new Date().toISOString()};
    state.logs.push(log); saveLocal(); render();
    const cloudLog=await syncInsert(log);
    if(cloudLog){
      const i=state.logs.indexOf(log);
      if(i>=0) state.logs[i]=cloudLog;
      saveLocal();
      render();
    } else {
      state.logs=state.logs.filter(x=>x!==log);
      state.exercises=[...new Set(state.logs.map(x=>x.exercise))];
      saveLocal();
      render();
      return;
    }
  }
  $("exerciseSelect").value=canonicalExercise; $("newExerciseWrap").classList.remove("visible");

  const isNewBest=qualifying(log) && (previousBest===null || Number(log.weight)>Number(previousBest));
  const overtook=qualifying(log) && otherBest!==null && Number(log.weight)>Number(otherBest) && (previousBest===null || Number(previousBest)<=Number(otherBest));

  if(overtook){
    const winner=state.person==="julia"?"Julia":"Jana";
    const loser=state.person==="julia"?"Jana":"Julia";
    $("message").innerHTML=`<strong>${winner} hat ${loser} überholt!</strong><br><span>Ab ins Gym ${loser}.</span>`;
  } else if(isNewBest){
    const increase=previousBest===null?null:Number(log.weight)-Number(previousBest);
    $("message").textContent=increase===null?"Neues Bestgewicht! 💪":`Neues Bestgewicht! +${increase} kg`;
  } else if(qualifying(log)) {
    $("message").textContent="Eingetragen. Zählt. 💪";
  } else {
    $("message").textContent="Als Training eingetragen — 3×8 zählt.";
  }
  $("weightInput").value="";
});

document.querySelectorAll(".person").forEach(b=>b.addEventListener("click",()=>{state.person=b.dataset.person;render();}));
$("addExerciseBtn").addEventListener("click",()=>{
  document.querySelector(".log-card").scrollIntoView({behavior:"smooth",block:"center"});
  $("exerciseSelect").value="__new__"; $("newExerciseWrap").classList.add("visible"); $("newExerciseInput").focus();
});
$("settingsBtn").addEventListener("click",()=>{
  $("settingsDialog").showModal();
});
$("closeSettings").addEventListener("click",()=>$("settingsDialog").close());
$("refreshCloud").addEventListener("click",async()=>{
  $("refreshCloud").disabled=true;
  $("refreshCloud").textContent="Lade…";
  const ok=await syncLoad();
  $("refreshCloud").disabled=false;
  $("refreshCloud").textContent="Jetzt synchronisieren";
  if(ok) $("message").textContent="Cloud-Sync aktuell.";
  $("settingsDialog").close();
});

(async function init(){
  try{
    state.supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    const ok=await syncLoad();
    if(!ok) render();
  }catch(err){
    console.error(err);
    render();
    $("message").textContent="Cloud-Sync konnte nicht gestartet werden.";
  }
})();