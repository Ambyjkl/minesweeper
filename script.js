(() => {
  const {
    boardTab,
    flag,
    mineCounter,
    reset,
    timer,
    heightInput,
    widthInput,
    mineInput,
    goForm,
    high,
  } = window;
  let activeCell = null;
  let mousedown = false;
  let bestTime = localStorage.getItem('bestTime');
  if (bestTime === null) {
    bestTime = Infinity;
    high.innerText = pad('---:---', 7);
  } else {
    bestTime = +bestTime;
    high.innerText = pad(bestTime / 1000, 7);
  }
  goForm.onsubmit = e => {
    e.preventDefault();
    const newHeight = +heightInput.value;
    const newWidth = +widthInput.value;
    const newNMines = +mineInput.value;
    if (newHeight && newWidth && newNMines) {
      resize(~~newHeight, ~~newWidth, ~~newNMines);
      heightInput.value = '';
      widthInput.value = '';
      mineInput.value = '';
    }
  };
  boardTab.addEventListener('mouseleave', () => {
    if (mousedown) {
      mousedown = false;
      unhandleDown(activeCell);
      reset.className = 'smile';
    }
  }, { capture: false, passive: true });
  flag.addEventListener('mousedown', () => {
    flag.classList.toggle('clicking');
  }, { capture: false, passive: true });
  let primary = 1;
  let secondary = 3;
  let which = 0;
  flag.addEventListener('mouseup', () => {
    primary = secondary + (secondary = primary, 0);
  }, { capture: false, passive: true });
  const colors = {
    1: 'blue',
    2: 'green',
    3: 'red',
    4: 'purple',
    5: 'maroon',
    6: 'turquoise',
    7: 'black',
    8: 'gray',
  };
  function createCell(row, col) {
    return {
      status: INITIAL,
      mine: false,
      value: 0,
      el: null,
      row,
      col,
    };
  }

  const extraHeight = 2.4;
  const extraWidth = 0.8;
  function setSize() {
    const fullHeight = height + extraHeight;
    const fullWidth = width + extraWidth;
    document.documentElement.style.fontSize = fullWidth < fullHeight ? `${75 / fullHeight}vh` : `${75 / fullWidth}vw`;
  }
  function resize(newHeight, newWidth, newNMines) {
    digits = Math.ceil(Math.log10(newNMines));
    resetGame();
    const diffW = newWidth - width;
    const diffH = newHeight - height;
    const smallerH = diffH > 0 ? height : newHeight;
    if (diffW > 0) {
      for (var i = 0; i < smallerH; i++) {
        const row = board[i];
        const frag = document.createDocumentFragment();
        for (var j = 0; j < diffW; j++) {
          const cell = createCell(i, j + width);
          row.push(cell);
          const el = createEl(cell);
          frag.appendChild(el);
        }
        domRows[i].appendChild(frag);
      }
    } else if (diffW < 0) {
      for (i = 0; i < smallerH; i++) {
        const domRow = domRows[i];
        for (j = 0; j < -diffW; j++) {
          domRow.lastElementChild.remove();
        }
        board[i].length = newWidth;
      }
    }
    width = newWidth;
    if (diffH > 0) {
      const frag = document.createDocumentFragment();
      for (i = 0; i < diffH; i++) {
        const row = [];
        const tr = document.createElement('tr');
        for (j = 0; j < width; j++) {
          const cell = createCell(i + height, j);
          row.push(cell);
          const el = createEl(cell);
          tr.appendChild(el);
        }
        frag.appendChild(tr);
        domRows.push(tr);
        board.push(row);
      }
      boardTab.appendChild(frag);
    } else if (diffH < 0) {
      domRows.splice(newHeight).forEach(el => el.remove());
      board.length = newHeight;
    }
    height = newHeight;
    setSize();
    nMines = newNMines;
    initMines();
    remaining = height * width - newNMines;
    remainingFlags = newNMines;
    checkWin();
  }
  window.addEventListener('keydown', e => {
    if (e.ctrlKey) {
      switch (e.code) {
      case 'KeyR':
        reinit();
        e.preventDefault();
        e.stopPropagation();
        break;
      }
    }
  }, { capture: false, passive: true });
  const around = cell => {
    const { row, col } = cell;
    const rowMin = row > 0;
    const rowMax = row < height - 1;
    const colMax = col < width - 1;
    const colMin = col > 0;
    const arr = [];
    if (rowMin) {
      const curRow = board[row - 1];
      if (colMin) {
        arr.push(curRow[col - 1]);
      }
      arr.push(curRow[col]);
      if (colMax) {
        arr.push(curRow[col + 1]);
      }
    }
    const curRow = board[row];
    if (colMin) {
      arr.push(curRow[col - 1]);
    }
    if (colMax) {
      arr.push(curRow[col + 1]);
    }
    if (rowMax) {
      const curRow = board[row + 1];
      if (colMin) {
        arr.push(curRow[col - 1]);
      }
      arr.push(curRow[col]);
      if (colMax) {
        arr.push(curRow[col + 1]);
      }
    }
    return arr;
  };
  const board = [];
  let height = 10;
  let width = 10;
  setSize();

  let nMines = 15;
  let digits = Math.ceil(Math.log10(nMines));
  let remaining = height * width - nMines;
  let remainingFlags = nMines;
  const INITIAL = 0;
  const FLAGGED = 1;
  const QUESTION = 2;
  const OPENED = 3;
  for (var i = 0; i < height; i++) {
    const row = [];
    for (var j = 0; j < width; j++) {
      row.push(createCell(i, j));
    }
    board.push(row);
  }
  function pad(num, times = 3) {
    return ('!'.repeat(times) + num).slice(-times);
  }
  const mines = [];
  function initMines() {
    mineCounter.innerText = pad(nMines, digits);
    for (var i = 0; i < nMines; i++) {
      let rnd = ~~(Math.random() * (height * width));
      for (;;) {
        const row = ~~(rnd / width);
        const col = rnd % width;
        const cell = board[row][col];
        if (cell.mine === false) {
          cell.mine = true;
          mines.push(cell);
          const aroundCell = around(cell);
          for (const cell of aroundCell) {
            cell.value++;
          }
          break;
        } else {
          rnd = (rnd + 1) % (height * width);
        }
      }
    }
  }
  initMines();
  const domRows = [];
  function createEl(cell) {
    const el = document.createElement('td');
    cell.el = el;
    el.addEventListener('mouseup', () => handleUp(cell), { capture: false, passive: true });
    el.addEventListener('mousedown', e => handleDown(e, cell), { capture: false, passive: true });
    el.addEventListener('mouseenter', () => handleIn(cell), { capture: false, passive: true });
    return el;
  }
  const frag = document.createDocumentFragment();
  for (i = 0; i < height; i++) {
    const tr = document.createElement('tr');
    for (j = 0; j < width; j++) {
      const cell = board[i][j];
      const el = createEl(cell);
      tr.appendChild(el);
    }
    frag.appendChild(tr);
    domRows.push(tr);
  }
  boardTab.appendChild(frag);
  boardTab.oncontextmenu = () => false;
  boardTab.onselectstart = () => false;

  class Queue {
    constructor(...items) {
      this.queue = items;
      this.offset = 0;
    }

    get length() {
      return this.queue.length - this.offset;
    }

    dequeue() {
      const { queue } = this;
      if (queue.length === 0) return undefined;
      var item = queue[this.offset];
      if (++this.offset * 2 >= queue.length){
        queue.splice(0, this.offset);
        this.offset = 0;
      }
      return item;
    }
  }
  function bfs(cell) {
    const q = new Queue(cell);
    while (q.length > 0) {
      const cur = q.dequeue();
      if (cur.status !== INITIAL || cur.mine) continue;
      open(cur);
      remaining--;
      if (cur.value === 0) {
        const qq = q.queue;
        qq.push.apply(qq, around(cur));
      }
    }
    checkWin();
  }
  function checkWin() {
    if (remaining === 0) {
      reset.className = 'cool';
      gameFinished = true;
      clearInterval(interval);
      realTime = Date.now() - realTime;

      if (realTime < bestTime) {
        bestTime = realTime;
        high.innerText = pad(bestTime / 1000, 7);
        localStorage.setItem('bestTime', bestTime);
        newHighscoreCelebrate = setInterval(() => {
          high.style.color = high.style.color ? '' : 'black';
        }, 500);
      }
    }
  }
  let newHighscoreCelebrate = 0;
  let notStarted = true;
  function resetGame() {
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        const cell = board[i][j];
        cell.status = INITIAL;
        cell.mine = false;
        cell.value = 0;
        cell.el.innerText = '';
        cell.el.className = '';
      }
    }
    flagged.clear();
    mines.length = 0;
    reset.className = 'smile';
    if (gameFinished) {
      gameFinished = false;
    } else {
      clearInterval(interval);
    }
    time = 0;
    timer.innerText = '!!!';
    notStarted = true;
  }
  function open(cell) {
    cell.status = OPENED;
    if (cell.mine) {
      cell.el.classList.add('mine');
    } else {
      if (cell.value > 0) {
        cell.el.innerText = cell.value;
        cell.el.style.color = colors[cell.value] || 'black';
      }
    }
    cell.el.classList.add('opened');
  }
  function check(cell) {
    const aroundCell = around(cell);
    const numFlags = aroundCell.reduce((acc, cell) => cell.status === FLAGGED ? acc + 1 : acc, 0);
    if (numFlags === cell.value) {
      for (const cell of aroundCell) {
        if (cell.status === INITIAL) {
          if (cell.mine) {
            gameOver(cell);
            return;
          }
          bfs(cell);
        }
      }
    } else {
      for (const cell of aroundCell) {
        if (cell.status === INITIAL) {
          cell.el.classList.remove('clicking');
        }
      }
    }
    if (!gameFinished) {
      reset.className = 'smile';
    }
  }
  function checkUI(cell) {
    const aroundCell = around(cell);
    for (const cell of aroundCell) {
      if (cell.status === INITIAL) {
        cell.el.classList.add('clicking');
      }
    }
  }
  function uncheckUI(cell) {
    const aroundCell = around(cell);
    for (const cell of aroundCell) {
      if (cell.status === INITIAL) {
        cell.el.classList.remove('clicking');
      }
    }
  }
  let gameFinished = false;
  function gameOver(cell) {
    gameFinished = true;
    clearInterval(interval);
    reset.className = 'no';
    for (const cell of mines) {
      if (cell.status === INITIAL) {
        open(cell);
      }
    }
    for (const cell of flagged) {
      if (cell.mine === false) {
        cell.el.classList.add('wrong-flag');
      }
    }
    cell.el.classList.add('highlight');
  }
  const flagged = new Set();
  reset.addEventListener('mousedown', () => {
    reset.classList.add('clicking');
  }, { capture: false, passive: true });
  function reinit() {
    if (newHighscoreCelebrate) {
      clearInterval(newHighscoreCelebrate);
      high.style.color = '';
    }
    resetGame();
    initMines();
    remaining = height * width - nMines;
    remainingFlags = nMines;
  }
  reset.addEventListener('mouseup', () => {
    reset.classList.remove('clicking');
    reinit();
  }, { capture: false, passive: true });
  function handleIn(cell) {
    if (mousedown === false) return;
    unhandleDown(activeCell);
    activeCell = cell;
    uiIn(cell);
  }
  function handleDown(e, cell) {
    if (gameFinished) return;
    if (mousedown === true) return;
    mousedown = true;
    which = e.which;
    activeCell = cell;
    uiIn(cell);
  }
  function uiIn(cell) {
    if ((which === 1 || which === 2) && cell.status === OPENED) {
      checkUI(cell);
    } else if (which === primary && cell.status === INITIAL) {
      cell.el.classList.add('clicking');
    } else {
      return;
    }
    reset.className = 'o';
  }
  function unhandleDown(cell) {
    if (gameFinished) return;
    if ((which === 1 || which === 2) && cell.status === OPENED) {
      uncheckUI(cell);
    } else if (which === primary && cell.status === INITIAL) {
      cell.el.classList.remove('clicking');
    }
  }
  let time = 0;
  let realTime = 0;
  let interval = 0;
  function safeClick(cell, fallback = false) {
    const q = new Queue(cell);
    const set = new Set(q.queue);
    while (q.length > 0) {
      const cur = q.dequeue();
      if ((fallback || cur.value === 0) && cur.mine === false) {
        bfs(cur);
        return;
      } else {
        const aroundCur = around(cur);
        for (const cell of aroundCur) {
          if (set.has(cell) === false) {
            q.queue.push(cell);
            set.add(cell);
          }
        }
      }
    }
    if (fallback === false) {
      safeClick(cell, true);
    }
  }
  function handleUp(cell) {
    if (gameFinished) return;
    mousedown = false;
    const { el } = cell;
    el.classList.remove('clicking');
    if ((which === 1 || which === 2) && cell.status === OPENED) {
      check(cell);
    } else if (which === primary) {
      if (cell.status === INITIAL) {
        if (notStarted) {
          reset.className = 'smile';
          if (cell.mine || cell.value > 0) {
            safeClick(cell);
          } else {
            bfs(cell);
          }
        } else {
          if (cell.mine === true) {
            gameOver(cell);
          } else {
            reset.className = 'smile';
            bfs(cell);
          }
        }
      } else {
        return;
      }
    } else if (which === secondary) {
      switch (cell.status) {
      case OPENED: break;
      case INITIAL:
        if (remainingFlags > 0) {
          cell.status = FLAGGED;
          flagged.add(cell);
          remainingFlags--;
          mineCounter.innerText = pad(remainingFlags, digits);
          el.classList.add('flagged');
        } else {
          cell.status = QUESTION;
          el.classList.add('question');
        }
        break;
      case FLAGGED:
        cell.status = QUESTION;
        flagged.delete(cell);
        remainingFlags++;
        mineCounter.innerText = pad(remainingFlags, digits);
        el.classList.remove('flagged');
        el.classList.add('question');
        break;
      case QUESTION:
        cell.status = INITIAL;
        el.classList.remove('question');
      }
      return;
    }

    if (notStarted) {
      notStarted = false;
      realTime = Date.now();
      timer.innerText = pad(time);
      interval = setInterval(() => {
        time++;
        timer.innerText = pad(time);
      }, 1000);
    }
  }
})();