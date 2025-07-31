"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { findBestMove} from "../backend/minimax";
import { applyMove, isKingInCheck, getAllLegalMoves, cloneBoard } from "@/backend/move";
import { findBestMoveMCTS } from "../backend/montecarlo";
import Header from "./Header";

const algToCoord = (alg: string) => {
    if (alg.length !== 2) return null;
    const col = alg.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(alg.charAt(1));
    if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
    return { x: row, y: col };
};

export default function Page() {
    const [chessBoard, setChessBoard] = useState<string[][]>([
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""]
    ]);
    const [boardHistory, setBoardHistory] = useState<string[][][]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [whiteKingPos, setWhiteKingPos] = useState<{ x: number, y: number } | null>(null);
    const [whitePawnPos, setWhitePawnPos] = useState<{ x: number, y: number } | null>(null);
    const [blackKingPos, setBlackKingPos] = useState<{ x: number, y: number } | null>(null);

    const [selectedAlgorithm, setSelectedAlgorithm] = useState("minimax");
    const [isWhiteTurn, setIsWhiteTurn] = useState(false);
    const [selectedPiece, setSelectedPiece] = useState<{ x: number; y: number } | null>(null);
    const [gameStatus, setGameStatus] = useState("Game belum dimulai!");
    const [mateInMoves, setMateInMoves] = useState<string | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [checkStatus, setCheckStatus] = useState<string | null>(null);

    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [pendingPromotionMove, setPendingPromotionMove] = useState<any | null>(null);

    const aiProcessingRef = useRef(false);

    const updatePiecePositions = useCallback((board: string[][]) => {
        let wk: { x: number, y: number } | null = null;
        let wp: { x: number, y: number } | null = null;
        let bk: { x: number, y: number } | null = null;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece === 'K') wk = { x: r, y: c };
                else if (piece === 'P' || piece === 'Q' || piece === 'R' || piece === 'B' || piece === 'N') wp = { x: r, y: c };
                else if (piece === 'k') bk = { x: r, y: c };
            }
        }
        setWhiteKingPos(wk);
        setWhitePawnPos(wp);
        setBlackKingPos(bk);

        if (wk && bk) {
            const whiteInCheck = isKingInCheck(board, wk, true);
            const blackInCheck = isKingInCheck(board, bk, false);
            
            if (whiteInCheck && blackInCheck) {
                setCheckStatus("Both kings in check (impossible)");
            } else if (whiteInCheck) {
                setCheckStatus("Raja Putih dalam skak!");
            } else if (blackInCheck) {
                setCheckStatus("Raja Hitam dalam skak!");
            } else {
                setCheckStatus(null);
            }
        } else {
            setCheckStatus(null);
        }
    }, []);

    useEffect(() => {
        updatePiecePositions(chessBoard);

        if (isGameStarted) {
            setBoardHistory(prev => {
                const lastBoard = prev[prev.length - 1];
                if (!lastBoard || JSON.stringify(lastBoard) !== JSON.stringify(chessBoard)) {
                    return [...prev.slice(0, historyIndex + 1), chessBoard];
                }
                return prev;
            });
        }
    }, [chessBoard, updatePiecePositions, isGameStarted, historyIndex]);

    useEffect(() => {
        if (!isGameStarted) {
            setGameStatus("Game belum dimulai!");
            setMateInMoves(null);
            setCheckStatus(null);
        } else {
            setGameStatus("Game in progress");
            setMateInMoves(null);
        }
    }, [isGameStarted]);

    const runAI = useCallback(async () => {
        if (aiProcessingRef.current || !isWhiteTurn || gameStatus !== "Game in progress" || !isGameStarted) {
            return;
        }
        if (!whiteKingPos || !blackKingPos) {
            console.error("Important piece positions not initialized for AI.");
            setIsLoadingAI(false);
            aiProcessingRef.current = false;
            return;
        }

        aiProcessingRef.current = true;
        setIsLoadingAI(true);

        await new Promise(resolve => setTimeout(resolve, 800));

        let aiResult: { move: any | null, mateInMoves: number | null };

        if (selectedAlgorithm === "minimax") {
            const aiDepth = 5;
            aiResult = findBestMove(chessBoard, whiteKingPos, whitePawnPos, blackKingPos, aiDepth);
        } else if (selectedAlgorithm === "alternative1") {
            const mctsIterations = 5000;
            aiResult = findBestMoveMCTS(chessBoard, whiteKingPos, whitePawnPos, blackKingPos, isWhiteTurn, mctsIterations);
        } else {
            const legalMoves = getAllLegalMoves(chessBoard, true, whiteKingPos, whitePawnPos, blackKingPos);
            const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            aiResult = { move: randomMove, mateInMoves: null };
        }

        const bestMove = aiResult.move;
        const detectedMateInMoves = aiResult.mateInMoves;

        if (bestMove) {
            if (bestMove.piece === 'P' && bestMove.to.x === 0 && bestMove.promotion) {
                setPendingPromotionMove(bestMove);
                setShowPromotionModal(true);
                setIsLoadingAI(false);
                aiProcessingRef.current = false;
                return;
            }

            console.log(`AI Magnus plays: ${String.fromCharCode(97 + bestMove.from.y)}${8 - bestMove.from.x} -> ${String.fromCharCode(97 + bestMove.to.y)}${8 - bestMove.to.x}`);
            
            const { board: newBoard } = applyMove(chessBoard, bestMove, whiteKingPos, whitePawnPos, blackKingPos);

            setChessBoard(newBoard);
            setHistoryIndex(prev => prev + 1);
            setIsWhiteTurn(false);

            if (detectedMateInMoves !== null && detectedMateInMoves !== undefined) {
                setMateInMoves(`Skakmat dalam ${detectedMateInMoves} langkah`);
            } else {
                setMateInMoves(null);
            }

        } else {
            const isCurrentWhiteKingChecked = isKingInCheck(chessBoard, whiteKingPos, true);
            if (isCurrentWhiteKingChecked) {
                setGameStatus("Skakmat! Gukesh menang!");
            } else {
                setGameStatus("Kebuntuan! Seri!");
            }
            setMateInMoves(null);
        }

        setIsLoadingAI(false);
        aiProcessingRef.current = false;
    }, [chessBoard, whiteKingPos, whitePawnPos, blackKingPos, isWhiteTurn, gameStatus, isGameStarted, historyIndex, selectedAlgorithm]);

const handlePromotionChoice = useCallback((chosenPiece: string) => {
    console.log("masuk handlePromotionChoice dengan piece:", chosenPiece);
    
    if (!pendingPromotionMove) {
        console.error("No pending promotion move");
        setShowPromotionModal(false);
        setPendingPromotionMove(null);
        return;
    }

    let currentWhiteKingPos = null;
    let currentBlackKingPos = null;
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (chessBoard[r][c] === 'K') currentWhiteKingPos = { x: r, y: c };
            if (chessBoard[r][c] === 'k') currentBlackKingPos = { x: r, y: c };
        }
    }

    if (!currentWhiteKingPos || !currentBlackKingPos) {
        console.error("Cannot find king positions on current board");
        setShowPromotionModal(false);
        setPendingPromotionMove(null);
        return;
    }

    const finalMove = {
        from: pendingPromotionMove.from,
        to: pendingPromotionMove.to,
        piece: pendingPromotionMove.piece,
        promotion: chosenPiece
    };

    console.log(`AI Magnus's pawn promoted to: ${chosenPiece}`);

    let currentWhitePawnPos = null;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = chessBoard[r][c];
            if (piece === 'P' || piece === 'Q' || piece === 'R' || piece === 'B' || piece === 'N') {
                currentWhitePawnPos = { x: r, y: c };
                break;
            }
        }
    }

    const { board: newBoard } = applyMove(chessBoard, finalMove, currentWhiteKingPos, currentWhitePawnPos, currentBlackKingPos);

    setChessBoard(newBoard);
    setHistoryIndex(prev => prev + 1);
    setIsWhiteTurn(false);

    setShowPromotionModal(false);
    setPendingPromotionMove(null);
    setMateInMoves(null);

}, [chessBoard, pendingPromotionMove, historyIndex]);


    useEffect(() => {
        if (isWhiteTurn && !isLoadingAI && gameStatus === "Game in progress" && isGameStarted && !showPromotionModal) {
            console.log("AI Magnus turn");
            runAI();
        }
    }, [isWhiteTurn, isLoadingAI, gameStatus, isGameStarted, runAI, showPromotionModal]);

    useEffect(() => {
        if (!isGameStarted || !whiteKingPos || !blackKingPos) return;

        const whiteLegalMoves = getAllLegalMoves(chessBoard, true, whiteKingPos, whitePawnPos, blackKingPos);
        const blackLegalMoves = getAllLegalMoves(chessBoard, false, whiteKingPos, whitePawnPos, blackKingPos);

        const isWhiteChecked = isKingInCheck(chessBoard, whiteKingPos, true);
        const isBlackChecked = isKingInCheck(chessBoard, blackKingPos, false);

        if (gameStatus === "Game in progress") {
            if (isWhiteTurn) {
                if (whiteLegalMoves.length === 0) {
                    setGameStatus(isWhiteChecked ? "Skakmat! Gukesh menang!" : "Kebuntuan! Seri!");
                    setMateInMoves(null);
                }
            } else {
                if (blackLegalMoves.length === 0) {
                    setGameStatus(isBlackChecked ? "Skakmat! AI Magnus menang!" : "Kebuntuan! Seri!");
                    setMateInMoves(null);
                }
            }
        }
    }, [chessBoard, whiteKingPos, whitePawnPos, blackKingPos, isWhiteTurn, gameStatus, isGameStarted, mateInMoves]);

    const handleUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                const lines = content.split("\n").map(line => line.trim()).filter(line => line.length > 0);

                if (lines.length < 3) {
                    setGameStatus("Format file tidak valid. Diharapkan 3 baris untuk Raja Putih, Pion Putih, Raja Hitam.");
                    setTimeout(() => setGameStatus("Game belum dimulai!"), 3000);
                    return;
                }

                const wkCoord = algToCoord(lines[0]);
                const wpCoord = algToCoord(lines[1]);
                const bkCoord = algToCoord(lines[2]);

                if (!wkCoord || !wpCoord || !bkCoord) {
                    setGameStatus("Notasi aljabar tidak valid dalam file. Harap gunakan format seperti 'd4'.");
                    setTimeout(() => setGameStatus("Game belum dimulai!"), 3000);
                    return;
                }

                const newBoard = Array.from({ length: 8 }, () => Array(8).fill(""));
                let isValidPlacement = true;

                const positions = new Set();
                const addPiece = (coord: { x: number, y: number }, piece: string) => {
                    const key = `${coord.x},${coord.y}`;
                    if (positions.has(key)) {
                        isValidPlacement = false;
                        return;
                    }
                    positions.add(key);
                    newBoard[coord.x][coord.y] = piece;
                };

                addPiece(wkCoord, "K");
                addPiece(wpCoord, "P");
                addPiece(bkCoord, "k");

                if (!isValidPlacement) {
                    setGameStatus("Pengaturan papan tidak valid: Bidak tidak dapat menempati petak yang sama.");
                    setTimeout(() => setGameStatus("Game belum dimulai!"), 3000);
                    return;
                }

                if (Math.abs(wkCoord.x - bkCoord.x) <= 1 && Math.abs(wkCoord.y - bkCoord.y) <= 1) {
                    setGameStatus("Pengaturan papan tidak valid: Raja tidak dapat berdekatan di awal.");
                    setTimeout(() => setGameStatus("Game belum dimulai!"), 3000);
                    return;
                }

                if (isKingInCheck(newBoard, wkCoord, true) || isKingInCheck(newBoard, bkCoord, false)) {
                    setGameStatus("Pengaturan papan tidak valid: Raja dalam keadaan skak setelah penempatan awal.");
                    setTimeout(() => setGameStatus("Game belum dimulai!"), 3000);
                    return;
                }

                setChessBoard(newBoard);
                setBoardHistory([newBoard]);
                setHistoryIndex(0);
                setIsWhiteTurn(false);
                setGameStatus("Papan berhasil dimuat! Game in progress");
                setMateInMoves(null);
                aiProcessingRef.current = false;
                setIsGameStarted(true);
            };
            reader.readAsText(file);
        }
    };

    const randomizeBoard = () => {
        let newBoard: string[][];
        let wk: { x: number, y: number };
        let wp: { x: number, y: number };
        let bk: { x: number, y: number };
        let validBoard = false;
        let attempts = 0;

        while (!validBoard && attempts < 1000) {
            attempts++;
            newBoard = Array.from({ length: 8 }, () => Array(8).fill(""));
            wk = { x: Math.floor(Math.random() * 8), y: Math.floor(Math.random() * 8) };
            wp = { x: Math.floor(Math.random() * 8), y: Math.floor(Math.random() * 8) };
            bk = { x: Math.floor(Math.random() * 8), y: Math.floor(Math.random() * 8) };

            if ((wk.x === wp.x && wk.y === wp.y) ||
                (wk.x === bk.x && wk.y === bk.y) ||
                (wp.x === bk.x && wp.y === bk.y)) {
                continue;
            }

            if (Math.abs(wk.x - bk.x) <= 1 && Math.abs(wk.y - bk.y) <= 1) {
                continue;
            }

            newBoard[wk.x][wk.y] = "K";
            newBoard[wp.x][wp.y] = "P";
            newBoard[bk.x][bk.y] = "k";

            if (isKingInCheck(newBoard, wk, true) || isKingInCheck(newBoard, bk, false)) {
                continue;
            }

            validBoard = true;
        }

        if (!validBoard) {
            setGameStatus("Gagal membuat papan acak setelah 1000 percobaan.");
            setTimeout(() => setGameStatus("Game belum dimulai!"), 3000);
            return;
        }

        setChessBoard(newBoard!);
        setBoardHistory([newBoard!]);
        setHistoryIndex(0);
        setIsWhiteTurn(false);
        setGameStatus("Papan acak berhasil dibuat! Game in progress");
        setMateInMoves(null);
        aiProcessingRef.current = false;
        setIsGameStarted(true);
    };

    const handleCellClick = (row: number, col: number) => {
        if (isWhiteTurn || gameStatus !== "Game in progress" || isLoadingAI || !isGameStarted || showPromotionModal) {
            return;
        }
        if (!whiteKingPos || !blackKingPos) {
            console.error("Important piece positions not initialized for player.");
            return;
        }

        const piece = chessBoard[row][col];

        if (selectedPiece) {
            const { x: fromX, y: fromY } = selectedPiece;

            if (chessBoard[fromX][fromY] !== "k") {
                setSelectedPiece(null);
                return;
            }

            const potentialMove = { from: { x: fromX, y: fromY }, to: { x: row, y: col }, piece: 'k' };
            const legalMoves = getAllLegalMoves(chessBoard, false, whiteKingPos, whitePawnPos, blackKingPos);

            const isLegalMove = legalMoves.some(move =>
                move.from.x === potentialMove.from.x &&
                move.from.y === potentialMove.from.y &&
                move.to.x === potentialMove.to.x &&
                move.to.y === potentialMove.to.y
            );

            if (isLegalMove) {
                console.log(`Gukesh plays: ${String.fromCharCode(97 + fromY)}${8 - fromX} -> ${String.fromCharCode(97 + col)}${8 - row}`);
                
                const { board: newBoard } = applyMove(chessBoard, potentialMove, whiteKingPos, whitePawnPos, blackKingPos);
                setChessBoard(newBoard);
                setHistoryIndex(prev => prev + 1);
                setIsWhiteTurn(true);
                aiProcessingRef.current = false;
                setMateInMoves(null);
            } else {
                setGameStatus("Gerakan tidak valid untuk Raja Hitam.");
                setTimeout(() => setGameStatus("Game in progress"), 2000);
            }
            setSelectedPiece(null);
        } else if (piece === "k") {
            setSelectedPiece({ x: row, y: col });
        }
    };

    const resetGame = () => {
        const initialBoard = Array.from({ length: 8 }, () => Array(8).fill(""));
        
        setChessBoard(initialBoard);
        setWhiteKingPos(null);
        setWhitePawnPos(null);
        setBlackKingPos(null);
        setBoardHistory([]);
        setHistoryIndex(0);
        setIsWhiteTurn(false);
        setGameStatus("Game belum dimulai!");
        setMateInMoves(null);
        setCheckStatus(null);
        setSelectedPiece(null);
        setIsLoadingAI(false);
        aiProcessingRef.current = false;
        setIsGameStarted(false);
        setShowPromotionModal(false);
        setPendingPromotionMove(null);
    };

    const goToPreviousMove = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const prevBoard = boardHistory[newIndex];
            setChessBoard(prevBoard);
            
            const shouldBeWhiteTurn = newIndex % 2 === 0;
            setIsWhiteTurn(shouldBeWhiteTurn);
            
            setGameStatus("📽️ Viewing history - Move " + (newIndex + 1));
            setMateInMoves(null);
            aiProcessingRef.current = false;
            setShowPromotionModal(false);
            setPendingPromotionMove(null);
        }
    };

    const goToNextMove = () => {
        if (historyIndex < boardHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const nextBoard = boardHistory[newIndex];
            setChessBoard(nextBoard);
            
            const shouldBeWhiteTurn = newIndex % 2 === 0;
            setIsWhiteTurn(shouldBeWhiteTurn);
            
            if (newIndex === boardHistory.length - 1) {
                setGameStatus("Game in progress");
            } else {
                setGameStatus("📽️ Viewing history - Move " + (newIndex + 1));
            }
            setMateInMoves(null);
            aiProcessingRef.current = false;
            setShowPromotionModal(false);
            setPendingPromotionMove(null);
        }
    };

    const pieceMap: Record<string, string> = {
        K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
        k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
        "": "",
    };

    return (
		<div className="flex flex-col items-center mt-8 p-4 max-h-screen">
			<Header />
			<div className="flex flex-col lg:flex-row justify-center items-stretch gap-8 w-full max-w-7xl ">

			{/* Game Settings */}
			<div className="flex flex-col bg-white px-6 py-8 rounded-xl shadow-lg w-full max-w-[320px] h-fit">
				<h2 className="text-[18px] font-bold text-gray-800 mb-4">🎮 Pengaturan Permainan</h2>

				<div className="mb-4 w-full">
				<label htmlFor="upload-board" className="block text-gray-700 text-sm font-bold mb-2">Unggah Papan (.txt)</label>
				<input
					id="upload-board"
					type="file"
					accept=".txt"
					onChange={handleUploadFile}
					className="block w-full text-sm text-gray-500
					file:mr-4 file:py-2 file:px-4
					file:rounded-full file:border-0
					file:text-sm file:font-semibold
					file:bg-blue-50 file:text-blue-700
					hover:file:bg-blue-100 cursor-pointer"
				/>
				<p className="text-xs text-gray-500 mt-1">Format: white_king, white_pawn, black_king (contoh: d4, d5, d6)</p>
				</div>

				<button
				onClick={randomizeBoard}
				className="w-full bg-green-500 text-white py-2 px-4 rounded-full font-semibold hover:bg-green-600 transition duration-300 ease-in-out shadow-md mb-4"
				>
				Acak Papan
				</button>

				<div className="mb-4 w-full">
				<label htmlFor="select-algorithm" className="block text-gray-700 text-sm font-bold mb-2">Pilih Algoritma</label>
				<select
					id="select-algorithm"
					className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					onChange={(e) => setSelectedAlgorithm(e.target.value)}
					value={selectedAlgorithm}
				>
					<option value="minimax">Minimax (Alpha-Beta Pruning)</option>
					<option value="alternative1">MCTS (Monte Carlo Tree Search)</option>
				</select>
				</div>

				<button
				onClick={resetGame}
				className="w-full bg-red-500 text-white py-2 px-4 rounded-full font-semibold hover:bg-red-600 transition duration-300 ease-in-out shadow-md"
				>
				Reset Permainan
				</button>
			</div>

			{/* Chess Board */}
                <div className="bg-white p-6 rounded-xl shadow-lg flex-1 flex flex-col items-center h-fit">
                    <div className="border-4 border-gray-700 rounded-lg overflow-hidden">
                        <table className="border-collapse">
                            <tbody>
                                {chessBoard.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        <td className="w-8 h-12 text-center font-bold align-middle text-gray-700 select-none">
                                            {8 - rowIndex}
                                        </td>
                                        {row.map((piece, colIndex) => {
                                            const isLight = (rowIndex + colIndex) % 2 === 0;
                                            const bgColor = isLight ? "bg-blue-300" : "bg-green-700";
                                            const textColor = (piece === 'K' || piece === 'P' || piece === 'Q' || piece === 'R' || piece === 'B' || piece === 'N') ? "text-gray-100" : "text-gray-900";
                                            const isSelected = selectedPiece?.x === rowIndex && selectedPiece?.y === colIndex;
                                            const isPossibleMove = isGameStarted && selectedPiece && whiteKingPos && blackKingPos &&
                                                chessBoard[selectedPiece.x][selectedPiece.y] === "k" &&
                                                getAllLegalMoves(chessBoard, false, whiteKingPos, whitePawnPos, blackKingPos).some(move =>
                                                    move.from.x === selectedPiece.x && move.from.y === selectedPiece.y &&
                                                    move.to.x === rowIndex && move.to.y === colIndex
                                                );

                                            return (
                                                <td
                                                    key={colIndex}
                                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                                    className={`${bgColor} ${textColor} w-12 h-12 text-center text-4xl cursor-pointer transition-colors duration-100 ease-in-out
                                                        ${isSelected ? 'ring-4 ring-blue-500 scale-105' : ''}
                                                        ${isPossibleMove ? 'bg-blue-300 hover:bg-blue-400' : ''}
                                                        relative`}
                                                >
                                                    {pieceMap[piece] || (isPossibleMove && <span className="text-gray-600 text-3xl select-none opacity-70">•</span>)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                <tr>
                                    <td></td>
                                    {["a", "b", "c", "d", "e", "f", "g", "h"].map((letter) => (
                                        <td key={letter} className="w-12 h-8 text-center font-bold text-gray-700 select-none">
                                            {letter}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Game Status & Playback */}
                <div className="flex flex-col bg-white p-6 rounded-xl shadow-lg w-full max-w-[320px] h-fit">
                    <h2 className="text-[18px] font-bold text-gray-800 mb-4">📊 Status Permainan</h2>
                    <div className="mb-4 text-sm font-semibold text-gray-700">
                        <p>Giliran: <span className={`font-bold ${isWhiteTurn ? 'text-white bg-gray-800 px-2 py-1 rounded' : 'text-black bg-white px-2 py-1 rounded border border-gray-300'}`}>
                                {isWhiteTurn ? "AI Magnus (Putih)" : "Gukesh (Hitam)"}
                            </span></p>
                        <p className="mt-4">Status: <span className="text-blue-600">{gameStatus}</span></p>
                        
                        {checkStatus && (
                            <p className="mt-2 text-red-600 font-bold">⚠️ {checkStatus}</p>
                        )}
                        
                        {mateInMoves && (
                            <p className="mt-2 text-red-600 font-bold">Analisis: {mateInMoves}</p>
                        )}
                        
                        {isLoadingAI && (
                            <p className="mt-2 text-purple-600 animate-pulse">AI Magnus sedang berpikir...</p>
                        )}
                        
                        <div className="mt-3 text-xs text-gray-500">
                            <p>Move: {historyIndex + 1} / {boardHistory.length}</p>
                            {isGameStarted && whiteKingPos && blackKingPos && (
                                <div className="mt-1">
                                    <p>♔ Raja Putih: {String.fromCharCode(97 + whiteKingPos.y)}{8 - whiteKingPos.x}</p>
                                    <p>♚ Raja Hitam: {String.fromCharCode(97 + blackKingPos.y)}{8 - blackKingPos.x}</p>
                                    {whitePawnPos && (
                                        <p>{pieceMap[chessBoard[whitePawnPos.x][whitePawnPos.y] as keyof typeof pieceMap]} {chessBoard[whitePawnPos.x][whitePawnPos.y] === 'P' ? 'Pion' : 'Ratu/Bidak Promosi'} Putih: {String.fromCharCode(97 + whitePawnPos.y)}{8 - whitePawnPos.x}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 className="text-[18px] font-bold text-gray-800 mb-4 mt-6">Kontrol Pemutaran</h2>
                    <div className="flex space-x-4 w-full">
                        <button
                            onClick={goToPreviousMove}
                            disabled={historyIndex === 0}
                            className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-full font-semibold hover:bg-gray-400 transition duration-300 ease-in-out shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ⏪ Mundur
                        </button>
                        <button
                            onClick={goToNextMove}
                            disabled={historyIndex === boardHistory.length - 1}
                            className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-full font-semibold hover:bg-gray-400 transition duration-300 ease-in-out shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Maju ⏩
                        </button>
                    </div>
                    
                    {/* Algorithm Info */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-bold text-gray-700 mb-2">🔍 Info Algoritma</h3>
                        <p className="text-xs text-gray-600">
                            {selectedAlgorithm === "minimax" && "Menggunakan Minimax dengan Alpha-Beta Pruning untuk mencari langkah terbaik dengan evaluasi posisi yang mendalam."}
                            {selectedAlgorithm === "alternative1" && "Menggunakan Monte Carlo Tree Search (MCTS) dengan simulasi acak untuk menjelajahi pohon permainan."}
                            {selectedAlgorithm === "alternative2" && "Algoritma alternatif 2 - Implementasi bonus fitur."}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                            <p>Iterasi/Kedalaman: {selectedAlgorithm === "minimax" ? "5" : selectedAlgorithm === "alternative1" ? "5000 iterasi" : "Custom"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Promotion Modal */}
            {showPromotionModal && (
                <div className="fixed inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-4 border-blue-500">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">Pion Putih Promosi! Pilih Bidak:</h3>
                        <div className="flex justify-center space-x-4">
                            {['Q', 'R', 'B', 'N'].map(piece => (
                                <button
                                    key={piece}
                                    onClick={() => handlePromotionChoice(piece)}
                                    className="p-4 w-20 h-20 flex items-center justify-center bg-blue-600 text-white text-5xl rounded-xl shadow-md hover:bg-blue-700 transition transform hover:scale-105 duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
                                >
                                    {pieceMap[piece]}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-4">Pilih bidak untuk promosi pion AI Magnus.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
