"""Independent library check of doubleAI's finite witness, NOT its upper bound."""
import json,chess,chess.pgn
from pathlib import Path
p=Path(__file__).parent/'receipts'
with (p/'allcheck63.pgn').open() as f:game=chess.pgn.read_game(f)
assert game is not None and not game.errors
board=game.board();plies=0
for move in game.mainline_moves():
 assert move in board.legal_moves
 board.push(move);plies+=1
assert board.fen()==game.headers['FinalFEN']
moves=list(board.legal_moves)
assert len(moves)==63
assert all(board.gives_check(m) for m in moves)
print(json.dumps({'pythonChess':chess.__version__,'plies':plies,'finalFen':board.fen(),'legalMoves':len(moves),'allGiveCheck':True,'universal64UpperBoundVerified':False,'codecImplication':None},indent=2))
