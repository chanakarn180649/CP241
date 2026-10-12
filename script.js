//Chanakarn Hiransuksan 68102010550

//กำหนดค่่าเวลาและ phase
const ROUND_SECONDS = 180;
const PHASES = 5;

//กำหนดค่าตัวแปร
const numberBank = document.getElementById("numberBank");
const phaseList = document.getElementById("phaseList");
const sortTitle = document.getElementById("sortTitle");
const sortDescription = document.getElementById("sortDescription");
const timerElement = document.getElementById("timer");
const timerBar = document.getElementById("timerBar");
const timerCard = document.getElementById("timerCard");
const sendButton = document.getElementById("sendButton");
const feedback = document.getElementById("feedback");
const resultOverlay = document.getElementById("resultOverlay");
const resultCard = document.querySelector(".result-card");
const resultIcon = document.getElementById("resultIcon");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const remainingTimeWrap = document.getElementById("remainingTimeWrap");
const remainingTime = document.getElementById("remainingTime");
const replayButton = document.getElementById("replayButton");
const restartTop = document.getElementById("restartTop");

//ประกาศตัวแปร list ว่างเพื่อเก็บข้อมูล และตัวแปรควบคุมสถานะของเกม
let originalNumbers = [];
let algorithm = "bubble";
let expectedPhases = [];
let remainingSeconds = ROUND_SECONDS;
let timerInterval = null;
let gameEnded = false;
let checkedAtLeastOnce = false;
let selectedNumber = null;

//สุ่มโจทย์เลขทั้งหมด 5 ตัว
function randomNumbers() {
  const values = new Set();
  while (values.size < 5) values.add(Math.floor(Math.random() * 100) + 1);
  return [...values];
}

//กำหนดคำตอบของโจทย์ตัวเลขที่ต้องเรียงในโหมด Bubble sort
function calculateBubblePhases(numbers) {
  const values = [...numbers];
  const phases = [];
  for (let pass = 0; pass < values.length; pass++) {
    for (let j = 0; j < values.length - pass - 1; j++) {
      if (values[j] > values[j + 1]) {
        [values[j], values[j + 1]] = [values[j + 1], values[j]];
      }
    }
    phases.push([...values]);
  }
  return phases;
}

//กำหนดคำตอบของโจทย์ตัวเลขที่ต้องเรียงในโหมด Selection sort
function calculateSelectionPhases(numbers) {
  const values = [...numbers];
  const phases = [];
  for (let i = 0; i < values.length; i++) {
    let minIndex = i;
    for (let j = i + 1; j < values.length; j++) {
      if (values[j] < values[minIndex]) minIndex = j;
    }
    [values[i], values[minIndex]] = [values[minIndex], values[i]];
    phases.push([...values]);
  }
  return phases;
}

//กำหนดรูปแบบเวลา
function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const secs = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

//อัพเดทเวลาถอยหลังให้เห็นทุกวินาที
function updateTimerDisplay() {
  timerElement.textContent = formatTime(remainingSeconds);
  timerBar.style.width = `${(remainingSeconds / ROUND_SECONDS) * 100}%`;
  timerCard.classList.toggle("urgent", remainingSeconds <= 30);
}

//ทำให้โจทย์แต่ละตัวเลขเป็นกล่องที่สามารถลากกล่องตัวเลขจากโจทย์มาใส่ในกล่องช่องว่างแต่ละ phase ได้
function renderNumberBank() {
  numberBank.innerHTML = "";
  originalNumbers.forEach((number, index) => {
    const tile = document.createElement("div");
    tile.className = "number-tile";
    tile.textContent = number;
    tile.draggable = true;
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.setAttribute("aria-label", `ลากตัวเลข ${number} ไปใส่ช่อง`);
    tile.dataset.value = number;

    //เงื่อนไขการลากตัวเลข
    tile.addEventListener("dragstart", event => {
      if (gameEnded) return event.preventDefault();
      event.dataTransfer.setData("text/plain", String(number));
      event.dataTransfer.effectAllowed = "copy";
      tile.classList.add("dragging");
    });
    tile.addEventListener("dragend", () => tile.classList.remove("dragging"));
    tile.addEventListener("click", () => {
      if (gameEnded) return;
      document.querySelectorAll(".number-tile").forEach(item => item.classList.remove("selected"));
      tile.classList.add("selected");
      selectedNumber = number;
      feedback.textContent = `เลือก ${number} แล้ว คลิกช่องที่ต้องการเติม`;
      feedback.className = "feedback";
    });
    numberBank.appendChild(tile);
  });
}

//สร้างช่อง phase และช่องใส่ตัวเลข
function renderPhases() {
  phaseList.innerHTML = "";
  for (let phaseIndex = 0; phaseIndex < PHASES; phaseIndex++) {
    const row = document.createElement("div");
    row.className = "phase-row";
    row.dataset.phase = phaseIndex;

    const label = document.createElement("div");
    label.className = "phase-label";
    const status = document.createElement("span");
    status.className = "phase-status";
    status.textContent = "·";
    status.setAttribute("aria-label", "ยังไม่ได้ตรวจ");
    const title = document.createElement("strong");
    title.textContent = `PHASE ${phaseIndex + 1}`;
    const subtitle = document.createElement("span");
    subtitle.textContent = `PASS 0${phaseIndex + 1}`;
    label.append(status, title, subtitle);

    const slots = document.createElement("div");
    slots.className = "phase-slots";
    slots.setAttribute("aria-label", `Phase ${phaseIndex + 1}`);
    for (let slotIndex = 0; slotIndex < 5; slotIndex++) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "drop-slot";
      slot.textContent = "+";
      slot.dataset.slot = slotIndex;
      slot.setAttribute("aria-label", `Phase ${phaseIndex + 1}, ช่อง ${slotIndex + 1}`);
      slot.addEventListener("dragover", event => {
        if (gameEnded) return;
        event.preventDefault();
        slot.classList.add("drag-over");
        event.dataTransfer.dropEffect = "copy";
      });
      slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));
      slot.addEventListener("drop", event => {
        event.preventDefault();
        slot.classList.remove("drag-over");
        if (gameEnded) return;
        const value = Number(event.dataTransfer.getData("text/plain"));
        if (originalNumbers.includes(value)) setSlotValue(slot, value);
      });

      //คลิกเพื่อเติมตัวเลขหรือลบตัวเลขในช่องใส่ตัวเลข
      slot.addEventListener("click", () => {
        if (gameEnded) return;
        if (selectedNumber !== null) {
          setSlotValue(slot, selectedNumber);
          document.querySelectorAll(".number-tile").forEach(item => item.classList.remove("selected"));
          selectedNumber = null;
          feedback.textContent = "";
          feedback.className = "feedback";
        } else if (slot.dataset.value) {
          slot.dataset.value = "";
          slot.textContent = "+";
          slot.classList.remove("filled");
          clearValidation();
        }
      });
      slots.appendChild(slot);
    }
    row.append(label, slots);
    phaseList.appendChild(row);
  }
}

//เก็บค่าตัวเลขในช่องเติมตัวเลขเป็นรูปแบบ textContent
function setSlotValue(slot, value) {
  slot.dataset.value = String(value);
  slot.textContent = value;
  slot.classList.add("filled");
  clearValidation();
}

// reset การครวจคำตอบ
function clearValidation() {
  checkedAtLeastOnce = false;
  document.querySelectorAll(".phase-row").forEach(row => {
    row.classList.remove("correct", "incorrect");
    const status = row.querySelector(".phase-status");
    status.textContent = "·";
    status.setAttribute("aria-label", "ยังไม่ได้ตรวจ");
  });
}

//อ่านค่าตัวเลขในแต่ละ phase และส่งเป็นข้อมูล array
function getRowValues(row) {
  return [...row.querySelectorAll(".drop-slot")].map(slot =>
    slot.dataset.value ? Number(slot.dataset.value) : null
  );
}

//ตรวจคำตอบ
function checkAnswers() {
  let allCorrect = true;
  let completedRows = 0;
  const rows = [...document.querySelectorAll(".phase-row")];

  rows.forEach((row, index) => {
    const answer = getRowValues(row);
    const complete = answer.every(value => value !== null);
    const correct = complete && answer.every((value, slotIndex) => value === expectedPhases[index][slotIndex]);
    row.classList.toggle("correct", correct);
    row.classList.toggle("incorrect", !correct);
    const status = row.querySelector(".phase-status");
    //แสดงเครื่องหมาย ✓ หรือ ×
    status.textContent = correct ? "✓" : "×";
    status.setAttribute("aria-label", correct ? "ตอบถูก" : "ตอบผิด");
    if (correct) completedRows++;
    else allCorrect = false;
  });
  checkedAtLeastOnce = true;
  //เมื่อถูกหมด = จบเกม
  if (allCorrect) {
    feedback.textContent = "ถูกต้องทุก Phase! ยอดเยี่ยมมาก";
    feedback.className = "feedback success";
    endGame(true);
  } else {
    feedback.textContent = `ถูก ${completedRows}/5 Phase — แก้แถวที่มีกากบาทแล้วกด Send อีกครั้ง`;
    feedback.className = "feedback error";
  }
}

//สถานะจบเกม (ชนะหรือแพ้)
function endGame(won) {
  if (gameEnded) return;
  gameEnded = true;
  clearInterval(timerInterval);
  sendButton.disabled = true;
  document.querySelectorAll(".number-tile, .drop-slot").forEach(element => {
    element.draggable = false;
    element.style.cursor = "default";
  });
  resultCard.classList.toggle("lost", !won);
  resultIcon.textContent = won ? "✦" : "×";
  resultKicker.textContent = won ? "CHALLENGE COMPLETE" : "TIME EXPIRED";
  resultTitle.textContent = won ? "You win!" : "Time up — You lose";
  resultMessage.textContent = won
    ? "ทำได้ยอดเยี่ยมมาก เรียงถูกทุก Phase แล้ว"
    : "หมดเวลาแล้ว ลองเริ่มใหม่และสังเกตแต่ละ Pass ให้ดี";
  remainingTimeWrap.style.display = won ? "flex" : "none";
  remainingTime.textContent = formatTime(remainingSeconds);
  replayButton.textContent = won ? "Replay  ↻" : "Retry  ↻";
  resultOverlay.classList.remove("hidden");
}

//เริ่มจับเวลา
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameEnded) return;
    remainingSeconds--;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerDisplay();
      endGame(false);
    }
  }, 1000);
}

//เริ่มเกม & รีเซ็ทเกม
function startGame() {
  clearInterval(timerInterval);
  originalNumbers = randomNumbers();
  algorithm = Math.random() < 0.5 ? "bubble" : "selection";
  expectedPhases = algorithm === "bubble"
    ? calculateBubblePhases(originalNumbers)
    : calculateSelectionPhases(originalNumbers);
  remainingSeconds = ROUND_SECONDS;
  gameEnded = false;
  checkedAtLeastOnce = false;
  selectedNumber = null;
  resultOverlay.classList.add("hidden");
  resultCard.classList.remove("lost");
  sendButton.disabled = false;
  feedback.textContent = "";
  feedback.className = "feedback";
  if (algorithm === "bubble") {
    sortTitle.textContent = "Bubble Sort";
    sortDescription.textContent = "เปรียบเทียบตัวเลขที่อยู่ติดกัน แล้วสลับเมื่อเรียงผิดลำดับ";
  } else {
    sortTitle.textContent = "Selection Sort";
    sortDescription.textContent = "เลือกตัวเลขที่น้อยที่สุดจากส่วนที่เหลือ แล้วย้ายมาไว้ตำแหน่งถัดไป";
  }
  renderNumberBank();
  renderPhases();
  updateTimerDisplay();
  startTimer();
}

//ฟังค์ชั่นแต่ละปุ่ม
sendButton.addEventListener("click", () => {
  if (!gameEnded) checkAnswers();
});
replayButton.addEventListener("click", startGame);
restartTop.addEventListener("click", startGame);

// run เพื่อเริ่มเกม
startGame();
