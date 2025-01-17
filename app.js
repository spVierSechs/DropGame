const target = document.querySelector('.target');
const leaderBoard = document.querySelector('.leader-board');

const DEBUG = false;
let drops = [];
let highScores = [];


let hideLeaderBoardTimeout = setTimeout(() => {
  leaderBoard.style.display = 'none';
}, 90000);

let liveChatId = new Date().toLocaleDateString();

const emulateMessage = (username, text) => {
  if (text.startsWith('!drop')) {
    clearTimeout(hideLeaderBoardTimeout);
    hideLeaderBoardTimeout = setTimeout(() => {
      leaderBoard.style.display = 'none';
    }, 90000);
    const args = text.split(' ');
    args.shift();
    const arg = args.length ? args[0].trim() : '';
    const emojis = twemoji.parse(arg, {
      assetType: 'png'
    });
    if (emojis.length) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      doDrop({
        username,
        url: emoji.url,
        platform: "dg-front",
      });
    } else if (arg === 'me') {
      doDrop({
        username,
        isAvatar: true,
        platform: "dg-front",
      });
    } else {
      const emoteMatches = arg.match(/!\[\]\((.*)\)/);
      if (emoteMatches && emoteMatches[1].startsWith('http')) {
        doDrop({
          username,
          url: emoteMatches[1],
          platform: "dg-front",
        });
      } else {
        doDrop({
          username,
          platform: "dg-front",
        });
      }
    }
  }
}

function createDropElement(url, username, isAvatar = false) {
  const div = document.createElement('div');
  div.className = 'drop';
  div.innerHTML = `
  <h4 class="username">${username}</h4>
  <img class="chute" src="images/parachute.png" alt="">
  <div class="user-image">
    <img class="${isAvatar ? 'avatar' : ''}" src="${url || 'images/seed.png'}" />
  </div>`;
  return div;
}

const dropPrototype = {
  getLeft() {
    return this.location.x - this.element.clientWidth / 2;
  },
  getRight() {
    return this.location.x + this.element.clientWidth / 2;
  },
  getTop() {
    return this.location.y;
  },
  getBottom() {
    return this.location.y + this.element.clientHeight;
  },
  getCenter() {
    return {
      x: this.location.x,
      y: (this.getTop() + this.getBottom()) / 2,
    };
  }
};

function doDrop({
  username,
  url,
  isAvatar = false,
  platform
}) {
  const element = createDropElement(url, username, isAvatar);
  const drop = {
    __proto__: dropPrototype,
    username,
    platform,
    element,
    location: {
      x: window.innerWidth * Math.random(),
      y: -200,
    },
    velocity: {
      x: Math.random() * (Math.random() > 0.5 ? -1 : 1) * 10,
      y: 2 + Math.random() * 5
    },
  };
  drops.push(drop);
  document.body.appendChild(element);
  updateDropPosition(drop);
}

function updateDropPosition(drop) {
  if (drop.landed) return;
  drop.element.style.top = drop.getTop() + 'px';
  drop.element.style.left = drop.getLeft() + 'px';
}

function checkAABBCollision(A, B) {
  const AisToTheRightOfB = A.getLeft() > B.getRight();
  const AisToTheLeftOfB = A.getRight() < B.getLeft();
  const AisAboveB = A.getBottom() < B.getTop();
  const AisBelowB = A.getTop() > B.getBottom();
  return !(
    AisToTheRightOfB
    || AisToTheLeftOfB
    || AisAboveB
    || AisBelowB
  );
}

function isMovingAway(drop, drop2) {
  if (drop.getCenter().x < drop2.getCenter().x) {
    return drop.velocity.x < drop2.velocity.x;
  }
  else {
    return drop.velocity.x > drop2.velocity.x;
  }
}

function processCollision(drop, drop2) {
  if (
    !checkAABBCollision(drop, drop2)
    || isMovingAway(drop, drop2)
  ) {
    return;
  }
  // TODO: Implement a proper 2D impulse exchange when the gravity is implemented.
  // Now it could result in one of the drops flying upwards forever after collision.
  // For now exchanging x velocity works good enough.
  const tmp = drop.velocity.x;
  drop.velocity.x = drop2.velocity.x;
  drop2.velocity.x = tmp;
}

function processCollisions() {
  for (let i = 0; i < drops.length; i++) {
    const drop = drops[i];
    for (let j = i + 1; j < drops.length; j++) {
      const drop2 = drops[j];
      processCollision(drop, drop2)
    }
    // Process collisions with the browser edges
    if (drop.getLeft() < 0) {
      drop.velocity.x = Math.abs(drop.velocity.x)
    }
    else if (drop.getRight() >= window.innerWidth) {
      drop.velocity.x = -Math.abs(drop.velocity.x);
    }
  }
}

function update() {
  processCollisions();
  const targetHalfWidth = target.clientWidth / 2;
  drops.forEach(drop => {
    if (drop.landed) return;

    drop.location.x += drop.velocity.x;
    drop.location.y += drop.velocity.y;

    if (drop.getBottom() >= window.innerHeight) {
      drop.velocity.y = 0;
      drop.velocity.x = 0;
      drop.location.y = window.innerHeight - drop.element.clientHeight;
      drop.landed = true;
      drop.element.classList.add('landed');
      const {
        x
      } = drop.location;
      const diff = window.innerWidth / 2 - x;
      const score = Math.abs(diff);
      if (score <= targetHalfWidth) {
        const finalScore = (1 - (score / targetHalfWidth)) * 100;
        highScores.push({
          username: drop.username,
          score: finalScore.toFixed(2)
        });
        renderLeaderBoard();
        addSeedling(x, finalScore, drop.username);
        drop.element.classList.add('seedling-target');
      } else {
        drop.element.classList.add('no-target');
      }
      setTimeout(() => {
        document.body.removeChild(drop.element);
      }, 90000);
      drops = drops.filter(d => d != drop);
    }
  });
}

function addSeedling(x, score, username) {
  const container = document.createElement('div');
  container.className = 'seedling-container initial';
  const name = document.createElement('h4');
  name.className = 'username seedling-target';
  name.style.fontSize = (score / 100) * 2.5 + 'rem';
  name.textContent = username;
  const seedling = document.createElement('img');
  seedling.className = 'seedling';
  seedling.src = 'images/seedling.png';
  seedling.style.height = (score * 1.5) + 'px';
  container.appendChild(name);
  container.appendChild(seedling);
  document.body.appendChild(container);
  container.style.left = x + 'px';
  container.style.top = (window.innerHeight - container.clientHeight) + 'px';
}

function renderLeaderBoard(showBoard = true) {
  if (showBoard) leaderBoard.style.display = 'block';
  localStorage.setItem("dropgame-leaderboard", JSON.stringify(highScores))
  let uniqueUsers = {};
  highScores = highScores
    .sort((a, b) => b.score - a.score)
    .filter(h => {
      if (!uniqueUsers[h.username]) {
        uniqueUsers[h.username] = h;
        return true;
      } else if (+h.score > +uniqueUsers[h.username].score) {
        uniqueUsers[h.username].score = h.score;
      }
      return false;
    }).slice(0, 5);
  const scores = leaderBoard.querySelector('.scores');
  scores.innerHTML = highScores.reduce((html, {
    score,
    username
  }) => {
    return html + `<p>${score} - ${username}</p>`;
  }, '');
}

function draw() {
  drops.forEach(updateDropPosition);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();

if (DEBUG) {
  let focused = true;

  window.onfocus = function () {
    focused = true;
  };
  window.onblur = function () {
    focused = false;
  };
  let id = 1;
  const testDrop = () => {
    if (focused) {
      doDrop({ username: `test ${id++}`, url: '/images/seed.png', isAvatar: false, platform: 'debug' });
    }
    setTimeout(testDrop, Math.random() * 1000 * 2);
  };
  testDrop();
}

const drop = document.querySelector("#drop")
const clear = document.querySelector("#clear")
const usernameField = document.querySelector("#username")
const commandField = document.querySelector("#command")

drop.addEventListener("click", () => {
  emulateMessage(usernameField.value, commandField.value)
})

clear.addEventListener("click", () => {
  highScores = []
  localStorage.removeItem("dropgame-leaderboard")
})

const rControls = document.querySelector("#rcontrols")
const hide = document.querySelector("#hide")
const attach = document.querySelector("#attach")
const twitch = document.querySelector("#twitch")

hide.addEventListener("click", () => {
  rControls.classList.add("rc-hidden")
})


attach.addEventListener("click", () => {
  if (twitch.value) {
    rControls.classList.add("rc-hidden")
    attachClient(twitch.value)
  }
})

const attachClient = (name) => {
  const client = new tmi.Client({
    options: {
      debug: true,
    },
    connection: {
      secure: true,
      reconnect: true
    },
    channels: [name]
  });

  client.connect();

  client.on('message', (channel, tags, message, self) => {
    emulateMessage((tags["display-name"] || tags.username), message)
  });
}