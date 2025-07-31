import { getAllLegalMoves, isKingInCheck, applyMove, CHECKMATE_SCORE, STALEMATE_SCORE, evaluateBoard } from "./move";

interface MinimaxResult {
    score: number;
    movesToMate?: number;
}

export function minimax(
    board: string[][],
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    whiteKingPos: { x: number, y: number },
    whitePawnPos: { x: number, y: number } | null,
    blackKingPos: { x: number, y: number }
): MinimaxResult {
    if (!whiteKingPos || !blackKingPos) {
        return { score: maximizingPlayer ? -Infinity : Infinity };
    }

    const whiteLegalMoves = getAllLegalMoves(board, true, whiteKingPos, whitePawnPos, blackKingPos);
    const blackLegalMoves = getAllLegalMoves(board, false, whiteKingPos, whitePawnPos, blackKingPos);

    const isWhiteKingChecked = isKingInCheck(board, whiteKingPos, true);
    const isBlackKingChecked = isKingInCheck(board, blackKingPos, false);

    if (maximizingPlayer) {
        if (whiteLegalMoves.length === 0) {
            return isWhiteKingChecked ?
                { score: -CHECKMATE_SCORE, movesToMate: 0 } :
                { score: STALEMATE_SCORE };
        }
    } else {
        if (blackLegalMoves.length === 0) {
            return isBlackKingChecked ?
                { score: CHECKMATE_SCORE, movesToMate: 0 } :
                { score: STALEMATE_SCORE };
        }
    }

    if (depth === 0) {
        return { score: evaluateBoard(board, whiteKingPos, whitePawnPos, blackKingPos) };
    }

    if (maximizingPlayer) {
        let maxEval: MinimaxResult = { score: -Infinity };
        const moves = whiteLegalMoves;

        for (const move of moves) {
            const { board: newBoard, whiteKingPos: newWK, whitePawnPos: newWP, blackKingPos: newBK } =
                applyMove(board, move, whiteKingPos, whitePawnPos, blackKingPos);

            const evaluationResult = minimax(newBoard, depth - 1, alpha, beta, false, newWK, newWP, newBK);

            if (evaluationResult.score > maxEval.score) {
                maxEval = { ...evaluationResult };
                if (evaluationResult.movesToMate !== undefined) {
                    maxEval.movesToMate = evaluationResult.movesToMate + 1;
                }
            } else if (evaluationResult.score === maxEval.score &&
                evaluationResult.movesToMate !== undefined) {
                if (maxEval.movesToMate === undefined ||
                    evaluationResult.movesToMate + 1 < maxEval.movesToMate) {
                    maxEval.movesToMate = evaluationResult.movesToMate + 1;
                }
            }

            alpha = Math.max(alpha, maxEval.score);
            if (beta <= alpha) {
                break;
            }
        }
        return maxEval;
    } else {
        let minEval: MinimaxResult = { score: Infinity };
        const moves = blackLegalMoves;

        for (const move of moves) {
            const { board: newBoard, whiteKingPos: newWK, whitePawnPos: newWP, blackKingPos: newBK } =
                applyMove(board, move, whiteKingPos, whitePawnPos, blackKingPos);

            const evaluationResult = minimax(newBoard, depth - 1, alpha, beta, true, newWK, newWP, newBK);

            if (evaluationResult.score < minEval.score) {
                minEval = { ...evaluationResult };
                if (evaluationResult.movesToMate !== undefined) {
                    minEval.movesToMate = evaluationResult.movesToMate + 1;
                }
            } else if (evaluationResult.score === minEval.score &&
                evaluationResult.movesToMate !== undefined) {
                if (minEval.movesToMate === undefined ||
                    evaluationResult.movesToMate + 1 < minEval.movesToMate) {
                    minEval.movesToMate = evaluationResult.movesToMate + 1;
                }
            }

            beta = Math.min(beta, minEval.score);
            if (beta <= alpha) {
                break;
            }
        }
        return minEval;
    }
}

export function findBestMove(
    currentBoard: string[][],
    whiteKingPos: { x: number, y: number } | null,
    whitePawnPos: { x: number, y: number } | null,
    blackKingPos: { x: number, y: number } | null,
    depth: number
): { move: any | null, mateInMoves: number | null } {
    console.log("AI Magnus is thinking (Minimax)...");

    if (!whiteKingPos || !blackKingPos) {
        console.error("Invalid king positions when finding best move.");
        return { move: null, mateInMoves: null };
    }

    const legalMoves = getAllLegalMoves(currentBoard, true, whiteKingPos, whitePawnPos, blackKingPos);

    if (legalMoves.length === 0) {
        return { move: null, mateInMoves: null };
    }

    let bestMove: any | null = null;
    let maxEval: MinimaxResult = { score: -Infinity };

    for (const move of legalMoves) {
        const { board: newBoard, whiteKingPos: newWK, whitePawnPos: newWP, blackKingPos: newBK } =
            applyMove(currentBoard, move, whiteKingPos, whitePawnPos, blackKingPos);

        const evaluationResult = minimax(newBoard, depth - 1, -Infinity, Infinity, false, newWK, newWP, newBK);

        if (evaluationResult.score > maxEval.score) {
            maxEval = { ...evaluationResult };
            bestMove = move;
        } else if (evaluationResult.score === maxEval.score && evaluationResult.movesToMate !== undefined) {
            if (maxEval.movesToMate === undefined || evaluationResult.movesToMate < maxEval.movesToMate) {
                maxEval = { ...evaluationResult };
                bestMove = move;
            }
        }
    }

    let mateInFullMoves: number | null = null;
    if (maxEval.movesToMate !== undefined) {
        mateInFullMoves = Math.ceil((maxEval.movesToMate + 1) / 2);
        console.log(`Mate in ${mateInFullMoves} moves detected!`);
    }

    return { move: bestMove, mateInMoves: mateInFullMoves };
}
