import { cloneBoard, applyMove, getAllLegalMoves, isKingInCheck, evaluateBoard, CHECKMATE_SCORE, STALEMATE_SCORE } from './move';

interface MCTSNode {
    board: string[][];
    whiteKingPos: { x: number, y: number };
    whitePawnPos: { x: number, y: number } | null;
    blackKingPos: { x: number, y: number };
    isWhiteTurn: boolean;
    
    parent: MCTSNode | null;
    move: any | null;
    
    wins: number;
    visits: number;
    
    children: MCTSNode[];
    unvisitedMoves: any[];
    
    isTerminal: boolean;
}

/**
 * Membuat node MCTS baru.
 * @param board Status papan.
 * @param whiteKingPos Posisi raja putih.
 * @param whitePawnPos Posisi pion putih.
 * @param blackKingPos Posisi raja hitam.
 * @param isWhiteTurn Apakah giliran putih.
 * @param parent Node induk.
 * @param move Gerakan yang mengarah ke node ini.
 * @returns Node MCTS baru.
 */
function createNode(
    board: string[][],
    whiteKingPos: { x: number, y: number },
    whitePawnPos: { x: number, y: number } | null,
    blackKingPos: { x: number, y: number },
    isWhiteTurn: boolean,
    parent: MCTSNode | null = null,
    move: any | null = null
): MCTSNode {
    let isTerminal = false;
    let legalMoves: any[] = [];
    if (whiteKingPos && blackKingPos) {
        legalMoves = getAllLegalMoves(board, isWhiteTurn, whiteKingPos, whitePawnPos, blackKingPos);
        if (legalMoves.length === 0) {
            isTerminal = true;
        }
    } else {
        isTerminal = true;
    }

    return {
        board,
        whiteKingPos,
        whitePawnPos,
        blackKingPos,
        isWhiteTurn,
        parent,
        move,
        wins: 0,
        visits: 0,
        children: [],
        unvisitedMoves: isTerminal ? [] : [...legalMoves],
        isTerminal: isTerminal
    };
}

/**
 * Fungsi seleksi: Memilih anak dengan skor UCB1 tertinggi.
 * @param node Node saat ini.
 * @param C Parameter eksplorasi UCB1.
 * @returns Anak terbaik untuk dieksplorasi.
 */
function selectChild(node: MCTSNode, C: number): MCTSNode {
    let bestChild: MCTSNode | null = null;
    let bestUCB1 = -Infinity;

    for (const child of node.children) {
        if (child.visits === 0) {
            return child;
        }
        const ucb1 = (child.wins / child.visits) + C * Math.sqrt(Math.log(node.visits) / child.visits);
        if (ucb1 > bestUCB1) {
            bestUCB1 = ucb1;
            bestChild = child;
        }
    }
    return bestChild!;
}

/**
 * Fungsi ekspansi: Menambahkan satu anak baru ke pohon.
 * @param node Node yang akan diekspansi.
 * @returns Node anak yang baru diekspansi.
 */
function expandNode(node: MCTSNode): MCTSNode {
    const randomIndex = Math.floor(Math.random() * node.unvisitedMoves.length);
    const move = node.unvisitedMoves.splice(randomIndex, 1)[0];

    const { board: newBoard, whiteKingPos: newWK, whitePawnPos: newWP, blackKingPos: newBK } = 
        applyMove(node.board, move, node.whiteKingPos, node.whitePawnPos, node.blackKingPos);
    
    const newChild = createNode(newBoard, newWK, newWP, newBK, !node.isWhiteTurn, node, move);
    node.children.push(newChild);
    return newChild;
}

/**
 * Fungsi simulasi (rollout): Memainkan game secara acak dari node hingga terminal.
 * @param node Node awal simulasi.
 * @returns Hasil simulasi (1 untuk Putih menang, 0 untuk Seri, -1 untuk Hitam menang).
 */
function simulateGame(node: MCTSNode): number {
    let currentBoard = cloneBoard(node.board);
    let currentWK = { ...node.whiteKingPos };
    let currentWP = node.whitePawnPos ? { ...node.whitePawnPos } : null;
    let currentBK = { ...node.blackKingPos };
    let currentTurn = node.isWhiteTurn;

    let maxSimulationMoves = 100; 
    let simulationCount = 0;

    while (simulationCount < maxSimulationMoves) {
        if (!currentWK || !currentBK) {
            return 0;
        }

        const legalMoves = getAllLegalMoves(currentBoard, currentTurn, currentWK, currentWP, currentBK);
        
        if (legalMoves.length === 0) {
            const isKingChecked = isKingInCheck(currentBoard, currentTurn ? currentWK : currentBK, currentTurn);
            if (isKingChecked) {
                return currentTurn ? -1 : 1;
            } else {
                return 0;
            }
        }

        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const result = applyMove(currentBoard, randomMove, currentWK, currentWP, currentBK);
        
        currentBoard = result.board;
        currentWK = result.whiteKingPos;
        currentWP = result.whitePawnPos;
        currentBK = result.blackKingPos;
        currentTurn = !currentTurn;
        simulationCount++;
    }
    if (!currentWK || !currentBK) return 0;
    const finalScore = evaluateBoard(currentBoard, currentWK, currentWP, currentBK);
    if (finalScore > 0) return 1;
    if (finalScore < 0) return -1;
    return 0;
}

/**
 * Fungsi backpropagation: Memperbarui statistik node dari hasil simulasi.
 * @param node Node tempat simulasi dimulai.
 * @param result Hasil simulasi (1, 0, -1).
 */
function backpropagate(node: MCTSNode, result: number) {
    let currentNode: MCTSNode | null = node;
    while (currentNode) {
        currentNode.visits++;
        if ((currentNode.isWhiteTurn && result === 1) || (!currentNode.isWhiteTurn && result === -1)) {
            currentNode.wins++;
        } else if (result === 0) {
            currentNode.wins += 0.5; 
        }
        currentNode = currentNode.parent;
    }
}

/**
 * Menjalankan algoritma Monte Carlo Tree Search untuk menemukan gerakan terbaik.
 * @param rootBoard Status papan awal.
 * @param whiteKingPos Posisi raja putih.
 * @param whitePawnPos Posisi pion putih.
 * @param blackKingPos Posisi raja hitam.
 * @param isWhiteTurn Apakah giliran putih.
 * @param iterations Jumlah iterasi simulasi.
 * @param C Parameter eksplorasi UCB1.
 * @returns Gerakan terbaik yang ditemukan.
 */
export function findBestMoveMCTS(
    rootBoard: string[][],
    whiteKingPos: { x: number, y: number },
    whitePawnPos: { x: number, y: number } | null,
    blackKingPos: { x: number, y: number },
    isWhiteTurn: boolean,
    iterations: number = 1000,
    C: number = Math.sqrt(2)
): { move: any | null, mateInMoves: number | null } {
    console.log(`MCTS is thinking with ${iterations} iterations...`);

    if (!whiteKingPos || !blackKingPos) {
        console.error("King positions not defined for MCTS.");
        return { move: null, mateInMoves: null };
    }

    const rootNode = createNode(rootBoard, whiteKingPos, whitePawnPos, blackKingPos, isWhiteTurn);

    if (rootNode.isTerminal) {
        return { move: null, mateInMoves: null };
    }

    for (let i = 0; i < iterations; i++) {
        let node = rootNode;

        // 1. Selection
        while (node.unvisitedMoves.length === 0 && node.children.length > 0 && !node.isTerminal) {
            node = selectChild(node, C);
        }

        // 2. Expansion
        if (node.unvisitedMoves.length > 0 && !node.isTerminal) {
            node = expandNode(node);
        }
        
        // 3. Simulation
        let simulationResult: number;
        if (node.isTerminal) {
            const isKingChecked = isKingInCheck(node.board, node.isWhiteTurn ? node.whiteKingPos : node.blackKingPos, node.isWhiteTurn);
            if (isKingChecked) {
                simulationResult = node.isWhiteTurn ? -1 : 1;
            } else {
                simulationResult = 0; 
            }
        } else {
            simulationResult = simulateGame(node);
        }

        // 4. Backpropagation
        backpropagate(node, simulationResult);
    }

    // Pilih gerakan terbaik dari anak-anak rootNode
    let bestMove: any | null = null;
    let bestScore = -Infinity;

    // Jika giliran Hitam (pemain yang meminimalkan) di root, kita mencari skor terendah
    if (!isWhiteTurn) {
        bestScore = Infinity;
    }

    for (const child of rootNode.children) {
        if (child.visits === 0) continue; 

        const childWinRate = child.wins / child.visits;

        if (isWhiteTurn) {
            if (childWinRate > bestScore) {
                bestScore = childWinRate;
                bestMove = child.move;
            }
        } else {
            if (childWinRate < bestScore) {
                bestScore = childWinRate;
                bestMove = child.move;
            }
        }
    }
    return { move: bestMove, mateInMoves: null };
}
