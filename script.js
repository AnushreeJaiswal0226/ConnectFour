//hover elements with some UI elements as well
const modalEl = document.querySelector('#modalEl');
const title = document.querySelector('#title');
const instruction = document.querySelector('#instruction');
const startGameBtn = document.querySelector('#startGameBtn');
const instBtn = document.querySelector('#instBtn');
const textholder = document.querySelector('#textholder');
var gameovertxt = document.querySelector('#gameovertxt');

// game parameters
const DELAY_COMP = 0.5; // seconds for the computer to take its turn
const GRID_CIRCLE = 0.7; // circle size as a fraction of cell size
const GRID_COLS = 7; // number of game columns
const GRID_ROWS = 6; // number of game rows
const MARGIN = 0.02; // margin as a fraction of the shortest screen dimension

// colours
const COLOR_BACKGROUND = "black";
const COLOR_COMP = "red";
const COLOR_COMP_DRK = "darkred";
const COLOR_FRAME = "darkblue";
const COLOR_FRAME_BUTT = "darkslateblue";
const COLOR_PLAY = "yellow";
const COLOR_PLAY_DRK = "olive";
const COLOR_TIE = "darkgrey";
const COLOR_TIE_DRK = "white";
const COLOR_WIN = "steelblue";

// text
const TEXT_COMP = "BOT WINS";
const TEXT_PLAY = "PLAYER WINS";
const TEXT_TIE = "!! DRAW !!";

// classes
class Cell {
    constructor(left, top, w, h, row, col) {
        this.bot = top + h;
        this.left = left;
        this.right = left + w;
        this.top = top;
        this.w = w;
        this.h = h;
        this.row = row;
        this.col = col;
        this.cx = left + w / 2;
        this.cy = top + h / 2;
        this.r = w * GRID_CIRCLE / 2;
        this.highlight = null;
        this.owner = null;
        this.winner = false;
    }

    contains(x, y) {
        return x > this.left && x < this.right && y > this.top && y < this.bot;
    }

    // draw the circle or hole
    draw(/** @type {CanvasRenderingContext2D} */ ctx) {

        // owner colour
        let color = this.owner == null ? COLOR_BACKGROUND : this.owner ? COLOR_PLAY : COLOR_COMP;

        // draw the circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2);
        ctx.fill();

        // draw highlighting
        if (this.winner || this.highlight != null) {
            
            // colour
            color = this.winner ? COLOR_WIN : this.highlight ? COLOR_PLAY : COLOR_COMP;

            // draw a circle around the perimeter
            ctx.lineWidth = this.r / 4;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, this.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// set up the canvas and context
var canv = document.querySelector("canvas");
document.body.appendChild(canv);
var ctx = canv.getContext("2d");

// game variables
var gameOver, gameTied, grid = [], playersTurn, timeComp;
var start = false;

// dimensions
var height, width, margin;

// event listeners
canv.addEventListener("click", click);
canv.addEventListener("mousemove", highlightGrid);
window.addEventListener("resize", setDimensions);

// game loop
var timeDelta, timeLast;

function loop(timeNow) {
    // initialise timeLast
    if (!timeLast) {
        timeLast = timeNow;
    }

    // calculate the time difference
    timeDelta = (timeNow - timeLast) / 1000; // seconds
    timeLast = timeNow;

    // update
    goComputer(timeDelta);

    // draw
    drawBackground();
    drawGrid();

    // call the next frame
    requestAnimationFrame(loop);
}

function checkWin(row, col) {
    
    // get all the cells from each direction
    let diagL = [], diagR = [], horiz = [], vert = [];
    for (let i = 0; i < GRID_ROWS; i++) {
        for (let j = 0; j < GRID_COLS; j++) {
            
            // horizontal cells
            if (i == row) {
                horiz.push(grid[i][j]);
            }

            // vertical cells
            if (j == col) {
                vert.push(grid[i][j]);
            }

            // top left to bottom right
            if (i - j == row - col) {
                diagL.push(grid[i][j]);
            }

            // top right to bottom left
            if (i + j == row + col) {
                diagR.push(grid[i][j]);
            }
        }
    }

    // if any have four in a row, return a win!
    return connect4(diagL) || connect4(diagR) || connect4(horiz) || connect4(vert);
}

function connect4(cells = []) {
    let count = 0, lastOwner = null;
    let winningCells = [];
    for (let i = 0; i < cells.length; i++) {

        // no owner, reset the count
        if (cells[i].owner == null) {
            count = 0;
            winningCells = [];
        }

        // same owner, add to the count
        else if (cells[i].owner == lastOwner) {
            count++;
            winningCells.push(cells[i]);
        }

        // new owner, new count
        else {
            count = 1;
            winningCells = [];
            winningCells.push(cells[i]);
        }

        // set the lastOwner
        lastOwner = cells[i].owner;

        // four in a row is a win
        if (count == 4) {
            for (let cell of winningCells) {
                cell.winner = true;
            }
            return true;
        }
    }
    return false;
}

function click(ev) {
    if (gameOver) {
        return;
    }

    if (!playersTurn) {
        return;
    }

    selectCell();
}

function createGrid() {
    grid = [];

    // set up cell size and margins
    let cell, marginX, marginY;

    // portrait
    if ((width - margin * 2) * GRID_ROWS / GRID_COLS < height - margin * 2) {
        cell = (width - margin * 2) / GRID_COLS;
        marginX = margin;
        marginY = (height - cell * GRID_ROWS) / 2;
    }

    // landscape
    else {
        cell = (height - margin * 2) / GRID_ROWS;
        marginX = (width - cell * GRID_COLS) / 2;
        marginY = margin;
    }

    // populate the grid
    for (let i = 0; i < GRID_ROWS; i++) {
        grid[i] = [];
        for (let j = 0; j < GRID_COLS; j++) {
            let left = marginX + j * cell;
            let top = marginY + i * cell;
            grid[i][j] = new Cell(left, top, cell, cell, i, j);
        }
    }
}

function drawBackground() {
    ctx.fillStyle = COLOR_BACKGROUND;
    ctx.fillRect(0, 0, width, height);
}

function drawGrid() {

    // frame and butt
    let cell = grid[0][0];
    let fh = cell.h * GRID_ROWS;
    let fw = cell.w * GRID_COLS;
    ctx.fillStyle = COLOR_FRAME;

    ctx.fillRect(cell.left, cell.top, fw, fh);
    ctx.fillStyle = start ? playersTurn ? COLOR_PLAY : COLOR_COMP : COLOR_FRAME_BUTT;
    //left border
    ctx.fillRect(cell.left - margin, cell.top - margin, margin, fh + margin * 2);
    //right border
    ctx.fillRect(cell.left + fw + margin / 10, cell.top - margin, margin, fh + margin * 2);    
    //top border
    ctx.fillRect(cell.left - margin, cell.top - margin, fw + margin * 2, margin);

    //bottom border
    ctx.fillStyle = COLOR_FRAME_BUTT;
    ctx.fillRect(cell.left - margin, cell.top + fh - margin / 4, fw + margin * 2, margin * 2.5);

    // cells
    for (let row of grid) {
        for (let cell of row) {
            cell.draw(ctx);
        }
    }
}

function goComputer(delta) {
    if (playersTurn || gameOver) {
        return;
    }

    // count down till the computer makes its selection
    if (timeComp > 0) {
        timeComp -= delta;
        if (timeComp <= 0) {
            selectCell();
        }
        return;
    }

    // set up the options array
    let options = [];
    options[0] = []; // computer wins
    options[1] = []; // block the player from winning
    options[2] = []; // no significance
    options[3] = []; // give away a win

    // loop through each column
    let cell;
    for (let i = 0; i < GRID_COLS; i++) {
        cell = highlightCell(grid[0][i].cx, grid[0][i].cy);

        // column full, go to the next column
        if (cell == null) {
            continue;
        }

        // first priority, computer wins
        cell.owner = playersTurn;
        if (checkWin(cell.row, cell.col)) {
            options[0].push(i);
        } else {
        
            // second priority, block the player
            cell.owner = !playersTurn;
            if (checkWin(cell.row, cell.col)) {
                options[1].push(i);
            } else {
                cell.owner = playersTurn;

                // check the cell above
                if (cell.row > 0) {
                    grid[cell.row - 1][cell.col].owner = !playersTurn;

                    // last priority, let player win
                    if (checkWin(cell.row - 1, cell.col)) {
                        options[3].push(i);
                    }

                    // third priority, no significance
                    else {
                        options[2].push(i);
                    }

                    // deselect cell above
                    grid[cell.row - 1][cell.col].owner = null;
                }

                // no row above, third priority, no significance
                else {
                    options[2].push(i);
                }
            }
        }

        // cancel highlight and selection
        cell.highlight = null;
        cell.owner = null;
    }

    // clear the winning cells
    for (let row of grid) {
        for (let cell of row) {
            cell.winner = false;
        }
    }

    // randomly select a column in priority order
    let col;
    if (options[0].length > 0) {
        col = options[0][Math.floor(Math.random() * options[0].length)];
    } else if (options[1].length > 0) {
        col = options[1][Math.floor(Math.random() * options[1].length)];
    } else if (options[2].length > 0) {
        col = options[2][Math.floor(Math.random() * options[2].length)];
    } else if (options[3].length > 0) {
        col = options[3][Math.floor(Math.random() * options[3].length)];
    }

    // highlight the selected cell
    highlightCell(grid[0][col].cx, grid[0][col].cy);

    // set the delay
    timeComp = DELAY_COMP;
}

function highlightCell(x, y) {
    let col = null;
    for (let row of grid) {
        for (let cell of row) {

            // clear existing highlighting
            cell.highlight = null;

            // get the column
            if (cell.contains(x, y)) {
                col = cell.col;
            }
        }
    }

    if (col == null) {
        return;
    }

    // highlight the first unoccupied cell
    for (let i = GRID_ROWS - 1; i >= 0; i--) {
        if (grid[i][col].owner == null) {
            grid[i][col].highlight = playersTurn;
            return grid[i][col];
        }
    }
    return null;
}

function highlightGrid(/** @type {MouseEvent} */ ev) {
    if (!playersTurn || gameOver) {
        return;
    }
    highlightCell(ev.clientX, ev.clientY);
}

function newGame() {
    start = true;
    playersTurn = Math.random() < 0.5;
    gameOver = false;
    gameTied = false;
    //createGrid();
}

function selectCell() {
    let highlighting = false;
    OUTER: for (let row of grid) {
        for (let cell of row) {
            if (cell.highlight != null) {
                highlighting = true;
                cell.highlight = null;
                cell.owner = playersTurn;
                if (checkWin(cell.row, cell.col)) {
                    gameOver = true;
                    endGame();
                }
                break OUTER;
            }
        }
    }

    // don't allow selection if no highlighting
    if (!highlighting) {
        return;
    }

    // check for a tied game
    if (!gameOver) {
        gameTied = true;
        OUTER: for (let row of grid) {
            for (let cell of row) {
                if (cell.owner == null) {
                    gameTied = false;
                    break OUTER;
                }
            }
        }

        // set game over
        if (gameTied) {
            gameOver = true;
            endGame();
        }
    }

    // switch the player if no game over
    if (!gameOver) {
        playersTurn = !playersTurn;
    }
}

function endGame(){
    let text = gameTied ? TEXT_TIE : playersTurn ? TEXT_PLAY : TEXT_COMP;
    if (gameTied) {
        gameovertxt.innerHTML = TEXT_TIE;
    } else {
        gameovertxt.innerHTML = text;
    }
    console.log(text);
    setTimeout(() => {
        cancelAnimationFrame(loop);
        modalEl.style.display = 'flex';
        textholder.style.display = 'block';
        startGameBtn.innerHTML = "R e s t a r t";
        title.style.display = 'none';
        instruction.style.display = 'none';
        instBtn.style.display = 'block';

        var a;
        instBtn.addEventListener('click', () => {
            if(a == 1){
                gameovertxt.style.display = 'block';                
                title.style.display = 'none';
                instruction.style.display = 'none';
                instBtn.innerHTML = "I n s t r u c t i o n s";
                return a = 0;
            }
            else{
                gameovertxt.style.display = 'none';
                title.style.display = 'block';
                instruction.style.display = 'block';
                instBtn.innerHTML = "H i d e\xa0\xa0I n s t r u c t i o n s";
                return a = 1;
            }
        })
    }, 300);
}

function setDimensions() {
    height = window.innerHeight;
    width = window.innerWidth;
    margin = MARGIN * Math.min(height, width);
    canv.height = height;
    canv.width = width;
    createGrid();
    drawBackground();
    drawGrid();
    //newGame();
}
setDimensions();

//start game from button
startGameBtn.addEventListener('click', () => {
    //restart
    if(startGameBtn.innerHTML == "R e s t a r t"){
        location.reload();
    }
    //remove and add some elements
    modalEl.style.display = 'none';
    //start game
    newGame();
    requestAnimationFrame(loop);
})