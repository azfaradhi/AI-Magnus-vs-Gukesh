// backend/minimax.ts

const PIECE_VALUES = {
    'P': 100, // Pion Putih
    'Q': 900, // Ratu Putih
    'R': 500, // Rook (Benteng) - Nilai standar
    'B': 300, // Bishop (Gajah) - Nilai standar
    'N': 300, // Knight (Kuda) - Nilai standar
    'K': 0,   // Raja tidak punya nilai material, ditangani oleh skakmat/keamanan
    'k': 0,
};

export const CHECKMATE_SCORE = 100000; 
export const STALEMATE_SCORE = 0; 

export function isValidCoord(r: number, c: number): boolean {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function cloneBoard(board: string[][]): string[][] {
    return board.map(row => [...row]);
}

export function getPieceAt(board: string[][], r: number, c: number): string | null {
    if (!isValidCoord(r, c)) return null;
    const piece = board[r][c];
    return piece === '' ? null : piece;
}

function isWhitePiece(piece: string): boolean {
    return piece === 'P' || piece === 'Q' || piece === 'K' || piece === 'R' || piece === 'B' || piece === 'N';
}

function isBlackPiece(piece: string): boolean {
    return piece === 'k';
}

export function isSquareAttacked(board: string[][], r: number, c: number, attackingByWhite: boolean): boolean {
    const kingChar = attackingByWhite ? 'K' : 'k';
    const pawnChar = attackingByWhite ? 'P' : 'p';
    const queenChar = attackingByWhite ? 'Q' : 'q';
    const rookChar = attackingByWhite ? 'R' : 'r';
    const bishopChar = attackingByWhite ? 'B' : 'b';
    const knightChar = attackingByWhite ? 'N' : 'n';

    // Periksa serangan Raja (8 arah)
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newR = r + dr;
            const newC = c + dc;
            if (isValidCoord(newR, newC) && getPieceAt(board, newR, newC) === kingChar) {
                return true;
            }
        }
    }

    // Periksa serangan Pion
    if (attackingByWhite) {
        if (isValidCoord(r + 1, c - 1) && getPieceAt(board, r + 1, c - 1) === pawnChar) return true;
        if (isValidCoord(r + 1, c + 1) && getPieceAt(board, r + 1, c + 1) === pawnChar) return true;
    } else {
        if (isValidCoord(r - 1, c - 1) && getPieceAt(board, r - 1, c - 1) === pawnChar) return true;
        if (isValidCoord(r - 1, c + 1) && getPieceAt(board, r - 1, c + 1) === pawnChar) return true;
    }

    // Periksa serangan Ratu, Benteng, Gajah (sliding pieces)
    const slidingDirections = [
        [-1, 0], [1, 0], [0, -1], [0, 1],
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];

    for (const [dr, dc] of slidingDirections) {
        for (let i = 1; i < 8; i++) {
            const newR = r + dr * i;
            const newC = c + dc * i;
            if (!isValidCoord(newR, newC)) break;
            const piece = getPieceAt(board, newR, newC);
            if (piece === queenChar ||
                (i > 0 && (dr === 0 || dc === 0) && piece === rookChar) || 
                (i > 0 && (dr !== 0 && dc !== 0) && piece === bishopChar)
            ) {
                return true;
            }
            if (piece !== null) break;
        }
    }

    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
        const newR = r + dr;
        const newC = c + dc;
        if (isValidCoord(newR, newC) && getPieceAt(board, newR, newC) === knightChar) {
            return true;
        }
    }

    return false;
}

export function isKingInCheck(
    board: string[][],
    kingPos: { x: number; y: number } | null,
    isWhiteKing: boolean
): boolean {
    if (!kingPos) return false;
    return isSquareAttacked(board, kingPos.x, kingPos.y, !isWhiteKing);
}

function generateKingMoves(board: string[][], kingPos: { x: number; y: number }, isWhiteKing: boolean, opponentKingPos: { x: number; y: number } | null): any[] {
    const moves = [];
    const kingChar = isWhiteKing ? 'K' : 'k';
    const isOurPiece = isWhiteKing ? isWhitePiece : isBlackPiece;

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;

            const newR = kingPos.x + dr;
            const newC = kingPos.y + dc;

            if (isValidCoord(newR, newC)) {
                const targetPiece = getPieceAt(board, newR, newC);

                if (targetPiece && isOurPiece(targetPiece)) {
                    continue;
                }

                if (opponentKingPos && Math.abs(newR - opponentKingPos.x) <= 1 && Math.abs(newC - opponentKingPos.y) <= 1) {
                    continue;
                }

                const tempBoard = cloneBoard(board);
                tempBoard[kingPos.x][kingPos.y] = '';
                tempBoard[newR][newC] = kingChar;

                const newKingPos = { x: newR, y: newC };

                if (!isKingInCheck(tempBoard, newKingPos, isWhiteKing)) {
                    const moveObj: any = {
                        from: kingPos,
                        to: { x: newR, y: newC },
                        piece: kingChar
                    };

                    if (targetPiece && targetPiece !== '') {
                        moveObj.capture = targetPiece;
                    }

                    moves.push(moveObj);
                }
            }
        }
    }
    return moves;
}

export function generatePawnMoves(board: string[][], pawnPos: { x: number; y: number }, whiteKingPos: { x: number; y: number } | null): any[] {
    const moves = [];
    const pawnChar = 'P';
    const promotionPieces = ['Q', 'R', 'B', 'N'];

    const newR_forward = pawnPos.x - 1;
    if (isValidCoord(newR_forward, pawnPos.y) && getPieceAt(board, newR_forward, pawnPos.y) === null) {
        if (newR_forward === 0) {
            for (const promoPiece of promotionPieces) {
                const tempBoard = cloneBoard(board);
                tempBoard[pawnPos.x][pawnPos.y] = '';
                tempBoard[newR_forward][pawnPos.y] = promoPiece;

                if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                    moves.push({
                        from: pawnPos,
                        to: { x: newR_forward, y: pawnPos.y },
                        piece: pawnChar,
                        promotion: promoPiece
                    });
                }
            }
        } else {
            const tempBoard = cloneBoard(board);
            tempBoard[pawnPos.x][pawnPos.y] = '';
            tempBoard[newR_forward][pawnPos.y] = pawnChar;

            if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                moves.push({
                    from: pawnPos,
                    to: { x: newR_forward, y: pawnPos.y },
                    piece: pawnChar
                });
            }
        }
    }

    if (pawnPos.x === 6 &&
        getPieceAt(board, pawnPos.x - 1, pawnPos.y) === null &&
        getPieceAt(board, pawnPos.x - 2, pawnPos.y) === null) {

        const newR_twoSteps = pawnPos.x - 2;
        const tempBoard = cloneBoard(board);
        tempBoard[pawnPos.x][pawnPos.y] = '';
        tempBoard[newR_twoSteps][pawnPos.y] = pawnChar;

        if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
            moves.push({
                from: pawnPos,
                to: { x: newR_twoSteps, y: pawnPos.y },
                piece: pawnChar
            });
        }
    }

    const captureCols = [pawnPos.y - 1, pawnPos.y + 1];
    for (const newC of captureCols) {
        const newR_capture = pawnPos.x - 1;
        if (isValidCoord(newR_capture, newC)) {
            const targetPiece = getPieceAt(board, newR_capture, newC);
            if (targetPiece && isBlackPiece(targetPiece)) {
                if (newR_capture === 0) {
                    for (const promoPiece of promotionPieces) {
                        const tempBoard = cloneBoard(board);
                        tempBoard[pawnPos.x][pawnPos.y] = '';
                        tempBoard[newR_capture][newC] = promoPiece;

                        if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                            moves.push({
                                from: pawnPos,
                                to: { x: newR_capture, y: newC },
                                piece: pawnChar,
                                capture: targetPiece,
                                promotion: promoPiece
                            });
                        }
                    }
                } else {
                    const tempBoard = cloneBoard(board);
                    tempBoard[pawnPos.x][pawnPos.y] = '';
                    tempBoard[newR_capture][newC] = pawnChar;

                    if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                        moves.push({
                            from: pawnPos,
                            to: { x: newR_capture, y: newC },
                            piece: pawnChar,
                            capture: targetPiece
                        });
                    }
                }
            }
        }
    }
    return moves;
}

export function generateQueenMoves(board: string[][], queenPos: { x: number; y: number }, whiteKingPos: { x: number; y: number } | null): any[] {
    const moves = [];
    const queenChar = 'Q';

    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newR = queenPos.x + dr * i;
            const newC = queenPos.y + dc * i;

            if (!isValidCoord(newR, newC)) break;

            const targetPiece = getPieceAt(board, newR, newC);

            if (targetPiece && isWhitePiece(targetPiece)) break;

            const tempBoard = cloneBoard(board);
            tempBoard[queenPos.x][queenPos.y] = '';
            tempBoard[newR][newC] = queenChar;

            if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                const moveObj: any = {
                    from: queenPos,
                    to: { x: newR, y: newC },
                    piece: queenChar
                };

                if (targetPiece && targetPiece !== '') {
                    moveObj.capture = targetPiece;
                }

                moves.push(moveObj);
            }

            if (targetPiece !== null) break;
        }
    }
    return moves;
}


export function generateRookMoves(board: string[][], rookPos: { x: number; y: number }, whiteKingPos: { x: number; y: number } | null): any[] {
    const moves = [];
    const rookChar = 'R';
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newR = rookPos.x + dr * i;
            const newC = rookPos.y + dc * i;

            if (!isValidCoord(newR, newC)) break;

            const targetPiece = getPieceAt(board, newR, newC);

            if (targetPiece && isWhitePiece(targetPiece)) break;

            const tempBoard = cloneBoard(board);
            tempBoard[rookPos.x][rookPos.y] = '';
            tempBoard[newR][newC] = rookChar;

            if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                const moveObj: any = { from: rookPos, to: { x: newR, y: newC }, piece: rookChar };
                if (targetPiece && targetPiece !== '') moveObj.capture = targetPiece;
                moves.push(moveObj);
            }

            if (targetPiece !== null) break;
        }
    }
    return moves;
}

export function generateBishopMoves(board: string[][], bishopPos: { x: number; y: number }, whiteKingPos: { x: number; y: number } | null): any[] {
    const moves = [];
    const bishopChar = 'B';
    const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
        for (let i = 1; i < 8; i++) {
            const newR = bishopPos.x + dr * i;
            const newC = bishopPos.y + dc * i;

            if (!isValidCoord(newR, newC)) break;

            const targetPiece = getPieceAt(board, newR, newC);

            if (targetPiece && isWhitePiece(targetPiece)) break;

            const tempBoard = cloneBoard(board);
            tempBoard[bishopPos.x][bishopPos.y] = '';
            tempBoard[newR][newC] = bishopChar;

            if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
                const moveObj: any = { from: bishopPos, to: { x: newR, y: newC }, piece: bishopChar };
                if (targetPiece && targetPiece !== '') moveObj.capture = targetPiece;
                moves.push(moveObj);
            }

            if (targetPiece !== null) break;
        }
    }
    return moves;
}

export function generateKnightMoves(board: string[][], knightPos: { x: number; y: number }, whiteKingPos: { x: number; y: number } | null): any[] {
    const moves = [];
    const knightChar = 'N';
    const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    for (const [dr, dc] of knightMoves) {
        const newR = knightPos.x + dr;
        const newC = knightPos.y + dc;

        if (!isValidCoord(newR, newC)) continue;

        const targetPiece = getPieceAt(board, newR, newC);

        if (targetPiece && isWhitePiece(targetPiece)) continue;

        const tempBoard = cloneBoard(board);
        tempBoard[knightPos.x][knightPos.y] = '';
        tempBoard[newR][newC] = knightChar;

        if (!whiteKingPos || !isKingInCheck(tempBoard, whiteKingPos, true)) {
            const moveObj: any = { from: knightPos, to: { x: newR, y: newC }, piece: knightChar };
            if (targetPiece && targetPiece !== '') moveObj.capture = targetPiece;
            moves.push(moveObj);
        }
    }
    return moves;
}


export function getAllLegalMoves(
    board: string[][],
    isWhiteTurn: boolean,
    whiteKingPos: { x: number; y: number } | null,
    whitePawnPos: { x: number; y: number } | null,
    blackKingPos: { x: number; y: number } | null
): any[] {
    let moves: any[] = [];

    if (!whiteKingPos || !blackKingPos) {
        console.warn("King positions not defined, cannot generate legal moves.");
        return [];
    }

    if (isWhiteTurn) {
        moves = moves.concat(generateKingMoves(board, whiteKingPos, true, blackKingPos));

        if (whitePawnPos) {
            const pieceAtPos = getPieceAt(board, whitePawnPos.x, whitePawnPos.y);
            if (pieceAtPos === 'P') {
                moves = moves.concat(generatePawnMoves(board, whitePawnPos, whiteKingPos));
            } else if (pieceAtPos === 'Q') {
                moves = moves.concat(generateQueenMoves(board, whitePawnPos, whiteKingPos));
            } else if (pieceAtPos === 'R') {
                moves = moves.concat(generateRookMoves(board, whitePawnPos, whiteKingPos));
            } else if (pieceAtPos === 'B') {
                moves = moves.concat(generateBishopMoves(board, whitePawnPos, whiteKingPos));
            } else if (pieceAtPos === 'N') {
                moves = moves.concat(generateKnightMoves(board, whitePawnPos, whiteKingPos));
            }
        }
    } else {
        moves = moves.concat(generateKingMoves(board, blackKingPos, false, whiteKingPos));
    }

    return moves;
}

export function applyMove(
    board: string[][],
    move: any,
    whiteKingPos: { x: number, y: number },
    whitePawnPos: { x: number, y: number } | null,
    blackKingPos: { x: number, y: number }
) {
    const newBoard = cloneBoard(board);
    const newWhiteKingPos = { ...whiteKingPos };
    let newWhitePawnPos = whitePawnPos ? { ...whitePawnPos } : null;
    const newBlackKingPos = { ...blackKingPos };

    newBoard[move.from.x][move.from.y] = '';

    let pieceToPlace = move.piece;
    if (move.promotion) {
        pieceToPlace = move.promotion;
    }
    newBoard[move.to.x][move.to.y] = pieceToPlace;

    if (move.piece === 'K') {
        newWhiteKingPos.x = move.to.x;
        newWhiteKingPos.y = move.to.y;
    } else if (move.piece === 'P') {
        newWhitePawnPos = { x: move.to.x, y: move.to.y };
    } else if (['Q', 'R', 'B', 'N'].includes(move.piece) && whitePawnPos && move.from.x === whitePawnPos.x && move.from.y === whitePawnPos.y) {
        newWhitePawnPos = { x: move.to.x, y: move.to.y };
    } else if (move.piece === 'k') {
        newBlackKingPos.x = move.to.x;
        newBlackKingPos.y = move.to.y;
    }

    return {
        board: newBoard,
        whiteKingPos: newWhiteKingPos,
        whitePawnPos: newWhitePawnPos,
        blackKingPos: newBlackKingPos
    };
}

export function evaluateBoard(board: string[][], whiteKingPos: { x: number, y: number }, whitePawnPos: { x: number, y: number } | null, blackKingPos: { x: number, y: number }): number {
    let score = 0;

    // 1. Nilai Material
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (PIECE_VALUES[piece as keyof typeof PIECE_VALUES]) {
                score += PIECE_VALUES[piece as keyof typeof PIECE_VALUES];
            }
        }
    }

    // 2. Keamanan Raja (Hitam) & Mobilitas Raja (Hitam)
    const blackKingMoves = getAllLegalMoves(board, false, whiteKingPos, whitePawnPos, blackKingPos);
    score += (4 - blackKingMoves.length) * 15;

    if (isKingInCheck(board, whiteKingPos, true)) {
        score -= 50;
    }
    if (isKingInCheck(board, blackKingPos, false)) {
        score += 75;
    }


    // 3. Nilai Bidak Promosi & Posisi
    if (whitePawnPos) {
        const pieceAtPos = board[whitePawnPos.x][whitePawnPos.y];

        if (pieceAtPos === 'P') {
            const advancement = 6 - whitePawnPos.x;
            score += advancement * 40;

            if (whitePawnPos.x <= 2) score += 100;
            if (whitePawnPos.x === 1) score += 200;
        } else if (['Q', 'R', 'B', 'N'].includes(pieceAtPos)) {
            score += 200;

            if (pieceAtPos === 'Q') score += 100;
            else if (pieceAtPos === 'R') score += 80;
            else if (pieceAtPos === 'B') score += 60;
            else if (pieceAtPos === 'N') score += 60;

            const centerDistance = Math.abs(3.5 - whitePawnPos.x) + Math.abs(3.5 - whitePawnPos.y);
            score += (7 - centerDistance) * 5;
        }
    }

    if (whiteKingPos && blackKingPos) {
        const kingDistance = Math.abs(whiteKingPos.x - blackKingPos.x) + Math.abs(whiteKingPos.y - blackKingPos.y);
        score += (14 - kingDistance) * 8;

        if (whitePawnPos && board[whitePawnPos.x][whitePawnPos.y] === 'P') {
            const kingToPawnDistance = Math.abs(whiteKingPos.x - whitePawnPos.x) + Math.abs(whiteKingPos.y - whitePawnPos.y);
            score += (7 - kingToPawnDistance) * 10;
        }
    }

    if (whitePawnPos && board[whitePawnPos.x][whitePawnPos.y] === 'P') {
        if (whitePawnPos.x > 0) {
            const frontSquare = { x: whitePawnPos.x - 1, y: whitePawnPos.y };
            if (isValidCoord(frontSquare.x, frontSquare.y) && !isSquareAttacked(board, frontSquare.x, frontSquare.y, false)) {
                score += 20;
            }
        }
    }

    return score;
}