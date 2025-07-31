
export default function Header() {
    return (
        <div className="flex flex-col items-center">
            <h1 className="text-[32px] font-extrabold text-gray-800 mb-4">AI Magnus vs Gukesh</h1>
            <p className="text-[20px] text-gray-600 mb-2">Siapa yang akan memenangkan pertandingan?</p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="bg-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
                    <span className="text-2xl">♔</span>
                    <span className="text-lg font-semibold text-gray-700">
                        AI Magnus (Putih)
                    </span>
                </div>
                <div className="bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2">
                    <span className="text-2xl">♚</span>
                    <span className="text-lg font-semibold">
                        Gukesh (Hitam): You
                    </span>
                </div>
            </div>
        </div>
    );
}
