import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "tic-tac-toe",
    title: "Tic-Tac-Toe Game State",
    subtitle: "A state machine validator that enforces the rules of Tic-Tac-Toe between two players",
    date: "2025-02-23T13:00:00.000Z",
    readTime: "10 min read",
    tags: ["plutus", "cardano", "game", "state-machine", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=17",
    },
};

export default function TicTacToeArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module TicTacToe where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData,
                                            fromBuiltinData)
import           PlutusTx.Prelude          (Bool (True, False), Integer,
                                            traceIfFalse, (==), (&&), ($), (||),
                                            not, otherwise, traceError)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- Each cell on the board is either Empty, X, or O
data Cell = Empty | X | O
PlutusTx.unstableMakeIsData ''Cell

-- The turn tells us whose move it is
data Turn = TurnX | TurnO
PlutusTx.unstableMakeIsData ''Turn

-- The game's full state: who the two players are, the 3x3 board (as a flat
-- list of 9 cells), and whose turn it is.
data GameDatum = GameDatum
    { playerX  :: PlutusV2.PubKeyHash
    , playerO  :: PlutusV2.PubKeyHash
    , board    :: [Cell]       -- 9 cells: indices 0-8 (row-major order)
    , turn     :: Turn         -- Whose move is it?
    }
PlutusTx.unstableMakeIsData ''GameDatum

-- The Redeemer is the position (0-8) where the current player places their mark
data GameAction = Play Integer | ClaimWin | ClaimDraw
PlutusTx.unstableMakeIsData ''GameAction

-- Helper: check if two cells are the same non-empty mark
{-# INLINABLE sameNonEmpty #-}
sameNonEmpty :: Cell -> Cell -> Bool
sameNonEmpty X X = True
sameNonEmpty O O = True
sameNonEmpty _ _ = False

-- Helper: get element from a list by index
{-# INLINABLE getCell #-}
getCell :: [Cell] -> Integer -> Cell
getCell []     _ = traceError "Index out of bounds"
getCell (c:cs) 0 = c
getCell (c:cs) n = getCell cs (n - 1)

-- Helper: set element in a list by index
{-# INLINABLE setCell #-}
setCell :: [Cell] -> Integer -> Cell -> [Cell]
setCell []     _ _ = traceError "Index out of bounds"
setCell (c:cs) 0 v = v : cs
setCell (c:cs) n v = c : setCell cs (n - 1) v

-- Helper: check if position is empty
{-# INLINABLE isEmpty #-}
isEmpty :: Cell -> Bool
isEmpty Empty = True
isEmpty _     = False

-- Check all 8 winning lines for a given mark
{-# INLINABLE checkWinner #-}
checkWinner :: [Cell] -> Cell -> Bool
checkWinner b mark =
    -- Rows
    (match 0 1 2) || (match 3 4 5) || (match 6 7 8) ||
    -- Columns
    (match 0 3 6) || (match 1 4 7) || (match 2 5 8) ||
    -- Diagonals
    (match 0 4 8) || (match 2 4 6)
  where
    match i j k = sameNonEmpty (getCell b i) mark &&
                  sameNonEmpty (getCell b j) mark &&
                  sameNonEmpty (getCell b k) mark

-- Check if board is completely full (no empty cells)
{-# INLINABLE boardFull #-}
boardFull :: [Cell] -> Bool
boardFull []         = True
boardFull (Empty:cs) = False
boardFull (_:cs)     = boardFull cs

{-# INLINABLE mkTicTacToeValidator #-}
mkTicTacToeValidator :: GameDatum -> GameAction -> PlutusV2.ScriptContext -> Bool
mkTicTacToeValidator dat action ctx = case action of
    Play pos ->
        -- The current player must sign the transaction
        traceIfFalse "Not your turn to play!" signedByCurrentPlayer &&
        -- Position must be 0-8
        traceIfFalse "Position out of range!" (pos >= 0 && pos <= 8) &&
        -- The cell must be empty
        traceIfFalse "Cell is already taken!" (isEmpty (getCell (board dat) pos)) &&
        -- The continuing output must have the correctly updated board + switched turn
        traceIfFalse "Invalid state update!" (validNewState pos)

    ClaimWin ->
        -- The claimer must have a winning line on the current board
        traceIfFalse "Not signed by claiming player!" signedByCurrentPlayer &&
        traceIfFalse "No winning line found!" hasWinner

    ClaimDraw ->
        -- Either player can claim a draw if the board is full with no winner
        traceIfFalse "Board is not full!" (boardFull (board dat)) &&
        traceIfFalse "There IS a winner, this is not a draw!" (not hasWinner)
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    currentPlayer :: PlutusV2.PubKeyHash
    currentPlayer = case turn dat of
        TurnX -> playerX dat
        TurnO -> playerO dat

    currentMark :: Cell
    currentMark = case turn dat of
        TurnX -> X
        TurnO -> O

    signedByCurrentPlayer :: Bool
    signedByCurrentPlayer = PlutusV2.txSignedBy info currentPlayer

    hasWinner :: Bool
    hasWinner = checkWinner (board dat) currentMark

    -- Validate the new board state in the continuing output
    validNewState :: Integer -> Bool
    validNewState pos = case getContinuingOutputs ctx of
        [output] -> case PlutusV2.txOutDatum output of
            PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                case fromBuiltinData rawDatum of
                    Just newDat ->
                        -- Board must be the old board with currentMark placed at pos
                        board newDat == setCell (board dat) pos currentMark &&
                        -- Turn must switch to the other player
                        switchedTurn (turn newDat)
                    Nothing -> False
            _ -> False
        _ -> False

    switchedTurn :: Turn -> Bool
    switchedTurn newTurn = case turn dat of
        TurnX -> case newTurn of { TurnO -> True; _ -> False }
        TurnO -> case newTurn of { TurnX -> True; _ -> False }

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkTicTacToeValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/tictactoe.plutus" validator
`;

    const bashCommands = `# 1. Initialize the Game — Empty board, Player X goes first
# Board: 9 Empty cells = [0,0,0,0,0,0,0,0,0] (constructor 0 = Empty)
# Turn: TurnX = constructor 0

$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat tictactoe.addr)+10000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"player_x_pkh_aaa..."},{"bytes":"player_o_pkh_bbb..."},{"list":[{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]}]},{"constructor":0,"fields":[]}]}' \\
  --change-address addr_test1_dummy_address \\
  --testnet-magic 2 \\
  --out-file tx-init-game.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Player X places mark at position 4 (center)
# Redeemer: Play 4 -> {"constructor": 0, "fields": [{"int": 4}]}
# New board: center is now X (constructor 1), turn switches to TurnO

$ cardano-cli conway transaction build \\
  --tx-in dummy_game_utxo_hash_2222222222222222#0 \\
  --tx-in-script-file tictactoe.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": [{"int": 4}]}' \\
  --tx-out $(cat tictactoe.addr)+9500000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"player_x_pkh_aaa..."},{"bytes":"player_o_pkh_bbb..."},{"list":[{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":1,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]}]},{"constructor":1,"fields":[]}]}' \\
  --required-signer-hash player_x_pkh_aaa \\
  --tx-in-collateral dummy_collateral_hash_333333333333#0 \\
  --change-address addr_test1_player_x_address \\
  --testnet-magic 2 \\
  --out-file tx-play-x.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-play-x.raw \\
  --signing-key-file ../../../keys/player_x.skey \\
  --testnet-magic 2 \\
  --out-file tx-play-x.signed

$ cardano-cli conway transaction submit --tx-file tx-play-x.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Tic-Tac-Toe is the "Hello World" of game theory. Everyone knows the rules,
                so it's the perfect sandbox for understanding how <em>complex game state</em>
                {" "}can be fully enforced on a blockchain. No game server needed. No referee.
                Just two players and a Plutus script that knows the rules better than both of them.
            </p>

            <p>
                This <strong>Tic-Tac-Toe Validator</strong> stores the entire 3×3 board as
                a list of 9 cells in the datum. Each move is a transaction where the current
                player places their mark, and the validator verifies <em>everything</em>: that
                it's actually their turn, the cell is empty, and the resulting board state
                is correct.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="TicTacToe.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>The Board as Data</h3>

            <p className="pexplaination">
                The board is represented as a flat list of 9 <code>Cell</code> values:
                {" "}<code>Empty</code>, <code>X</code>, or <code>O</code>. Indices 0-2 are
                the top row, 3-5 are the middle, 6-8 are the bottom. This flat representation
                is much cheaper in Plutus than nested lists because on-chain computation is
                priced by memory and CPU steps.
            </p>

            <CodeBlock
                code={`data Cell = Empty | X | O

data GameDatum = GameDatum
    { playerX :: PubKeyHash
    , playerO :: PubKeyHash
    , board   :: [Cell]    -- 9 cells: [0,1,2,3,4,5,6,7,8]
    , turn    :: Turn      -- TurnX or TurnO
    }`}
                language="haskell"
                filename="Board Representation"
            />

            <h3>Move Validation</h3>

            <p className="pexplaination pt-2">
                When Player X submits <code>Play 4</code>, the validator does four things:
                checks that Player X actually signed the transaction, confirms position 4
                is in range (0-8), verifies the cell at position 4 is <code>Empty</code>,
                and inspects the continuing output to make sure the new board has an{" "}
                <code>X</code> at position 4 with the turn flipped to <code>TurnO</code>.
            </p>

            <p className="pexplaination">
                If Player X tries to overwrite Player O's mark, the <code>isEmpty</code>
                {" "}check catches it. If they try to place two marks in one move, the{" "}
                <code>setCell</code> comparison catches it. If they don't switch the turn,
                the <code>switchedTurn</code> check catches it. Every angle is covered.
            </p>

            <h3>Win & Draw Detection</h3>

            <p className="pexplaination pt-2">
                The <code>checkWinner</code> function brute-forces all 8 possible winning
                lines (3 rows, 3 columns, 2 diagonals). When a player has three in a row,
                they submit a <code>ClaimWin</code> redeemer to close the game and
                unlock the prize pool. If the board fills up with no winner, either player
                can <code>ClaimDraw</code> to split the pot.
            </p>

            <CodeBlock
                code={`checkWinner b mark =
    (match 0 1 2) || (match 3 4 5) || (match 6 7 8) ||  -- rows
    (match 0 3 6) || (match 1 4 7) || (match 2 5 8) ||  -- columns
    (match 0 4 8) || (match 2 4 6)                        -- diagonals`}
                language="haskell"
                filename="Win Detection"
            />

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Each move is a separate on-chain transaction. The two players take turns
                building transactions that consume the current game state and produce an
                updated one. Think of it as passing a note back and forth, except the
                blockchain remembers every single note forever.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Tic-Tac-Toe CLI Commands"
            />

            <h3>The JSON Gets Wild</h3>

            <p className="pexplaination pt-2">
                Yes, that JSON datum is enormous. Each of the 9 board cells is an algebraic
                data type represented as a constructor object. In practice, you'd use a
                helper library or off-chain Haskell code to generate these JSON blobs —
                you wouldn't type them by hand. But seeing the raw representation helps
                you understand exactly what lives on-chain.
            </p>

        </div>
    );
}
