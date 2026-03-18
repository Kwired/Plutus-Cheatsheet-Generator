/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "tic-tac-toe",
    title: "Tic-Tac-Toe Game State",
    subtitle: "Enforcing a complete game of Tic-Tac-Toe with a Plutus state machine",
    date: "2025-02-21T09:00:00.000Z",
    readTime: "10 min read",
    tags: ["plutus", "cardano", "game", "state-machine", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=17",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "Gaming",

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

data Cell = Empty | X | O
PlutusTx.unstableMakeIsData ''Cell

data Turn = TurnX | TurnO
PlutusTx.unstableMakeIsData ''Turn

data GameDatum = GameDatum
    { playerX  :: PlutusV2.PubKeyHash
    , playerO  :: PlutusV2.PubKeyHash
    , board    :: [Cell]       -- 9 cells, indices 0-8, row-major
    , turn     :: Turn
    }
PlutusTx.unstableMakeIsData ''GameDatum

data GameAction = Play Integer | ClaimWin | ClaimDraw
PlutusTx.unstableMakeIsData ''GameAction

{-# INLINABLE sameNonEmpty #-}
sameNonEmpty :: Cell -> Cell -> Bool
sameNonEmpty X X = True
sameNonEmpty O O = True
sameNonEmpty _ _ = False

{-# INLINABLE getCell #-}
getCell :: [Cell] -> Integer -> Cell
getCell []     _ = traceError "Index out of bounds"
getCell (c:cs) 0 = c
getCell (c:cs) n = getCell cs (n - 1)

{-# INLINABLE setCell #-}
setCell :: [Cell] -> Integer -> Cell -> [Cell]
setCell []     _ _ = traceError "Index out of bounds"
setCell (c:cs) 0 v = v : cs
setCell (c:cs) n v = c : setCell cs (n - 1) v

{-# INLINABLE isEmpty #-}
isEmpty :: Cell -> Bool
isEmpty Empty = True
isEmpty _     = False

{-# INLINABLE checkWinner #-}
checkWinner :: [Cell] -> Cell -> Bool
checkWinner b mark =
    -- rows
    (match 0 1 2) || (match 3 4 5) || (match 6 7 8) ||
    -- cols
    (match 0 3 6) || (match 1 4 7) || (match 2 5 8) ||
    -- diags
    (match 0 4 8) || (match 2 4 6)
  where
    match i j k = sameNonEmpty (getCell b i) mark &&
                  sameNonEmpty (getCell b j) mark &&
                  sameNonEmpty (getCell b k) mark

{-# INLINABLE boardFull #-}
boardFull :: [Cell] -> Bool
boardFull []         = True
boardFull (Empty:cs) = False
boardFull (_:cs)     = boardFull cs

{-# INLINABLE mkTicTacToeValidator #-}
mkTicTacToeValidator :: GameDatum -> GameAction -> PlutusV2.ScriptContext -> Bool
mkTicTacToeValidator dat action ctx = case action of
    Play pos ->
        traceIfFalse "Not your turn to play!" signedByCurrentPlayer &&
        traceIfFalse "Position out of range!" (pos >= 0 && pos <= 8) &&
        traceIfFalse "Cell is already taken!" (isEmpty (getCell (board dat) pos)) &&
        traceIfFalse "Invalid state update!" (validNewState pos)

    ClaimWin ->
        traceIfFalse "Not signed by claiming player!" signedByCurrentPlayer &&
        traceIfFalse "No winning line found!" hasWinner

    ClaimDraw ->
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

    validNewState :: Integer -> Bool
    validNewState pos = case getContinuingOutputs ctx of
        [output] -> case PlutusV2.txOutDatum output of
            PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                case fromBuiltinData rawDatum of
                    Just newDat ->
                        board newDat == setCell (board dat) pos currentMark &&
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

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/tictactoe.plutus" validator
`;

    const bashCommands = `# 1. Start the game — empty board, Player X goes first
# Board: 9 Empty cells, Turn: TurnX (constructor 0)
$ cardano-cli conway transaction build \\
  --tx-in 9d4e2b17c903a56f81c2e94da70b3651f8c2d40b9ea71535c6f0e82d91a4b3c7#0 \\
  --tx-out $(cat tictactoe.addr)+10000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"player_x_pkh_aaa..."},{"bytes":"player_o_pkh_bbb..."},{"list":[{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]}]},{"constructor":0,"fields":[]}]}' \\
  --change-address addr_test1lcmzk9qcsvy83uzezekz3q2x43pcuanmpldwpdcnvj57368cwgcel \\
  --testnet-magic 2 \\
  --out-file tx-init-game.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Player X places at position 4 (center)
# Redeemer: Play 4. New board has X at center, turn switches to TurnO.
$ cardano-cli conway transaction build \\
  --tx-in 2b17c903a56f81c2e94da70b3651f8c2d40b9ea71535c6f0e82d91a4b3c7e9d4#0 \\
  --tx-in-script-file tictactoe.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": [{"int": 4}]}' \\
  --tx-out $(cat tictactoe.addr)+9500000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"player_x_pkh_aaa..."},{"bytes":"player_o_pkh_bbb..."},{"list":[{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":1,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]},{"constructor":0,"fields":[]}]},{"constructor":1,"fields":[]}]}' \\
  --required-signer-hash player_x_pkh_aaa \\
  --tx-in-collateral a56f81c2e94da70b3651f8c2d40b9ea71535c6f0e82d91a4b3c7e9d42b17c903#0 \\
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
                Tic-Tac-Toe is a good test case for on-chain game logic because everyone
                already knows the rules. The entire 3×3 board lives in the datum as a list
                of 9 cells, and the validator checks every move for legality — right player,
                empty cell, correct board update, correct turn switch.
            </p>

            <p>
                Each move is a separate Cardano transaction. Two players take turns
                building transactions that consume the current game state and produce an
                updated one at the same script address.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="TicTacToe.hs"
            />
            <br />

            <h2 id="explanation">Deep Dive</h2>

            <h3>Board representation</h3>

            <p className="pexplaination">
                The board is a flat list of 9 <code>Cell</code> values: <code>Empty</code>,{" "}
                <code>X</code>, or <code>O</code>. Indices 0-2 are the top row, 3-5 are
                middle, 6-8 are bottom. A flat list is cheaper than nested lists in Plutus
                because on-chain execution is priced by memory and CPU steps.
            </p>

            <CodeBlock
                code={`data Cell = Empty | X | O

data GameDatum = GameDatum
    { playerX :: PubKeyHash
    , playerO :: PubKeyHash
    , board   :: [Cell]    -- [0,1,2,3,4,5,6,7,8]
    , turn    :: Turn      -- TurnX or TurnO
    }`}
                language="haskell"
                filename="Board Layout"
            />

            <h3>Move validation</h3>

            <p className="pexplaination pt-2">
                When Player X submits <code>Play 4</code>, the validator checks four things:
                Player X signed the tx, position 4 is in range, cell 4 is empty, and the
                continuing output has the correct updated board with turn flipped to TurnO.
            </p>

            <p className="pexplaination">
                If X tries to overwrite O's mark, <code>isEmpty</code> catches it. If they
                try to place two marks, the <code>setCell</code> comparison catches it. If
                they forget to switch the turn, <code>switchedTurn</code> catches it.
            </p>

            <h3>Win and draw</h3>

            <p className="pexplaination pt-2">
                <code>checkWinner</code> brute-forces all 8 winning lines (3 rows, 3
                columns, 2 diagonals). When someone has three in a row, they submit{" "}
                <code>ClaimWin</code> to close the game. If the board fills up without a
                winner, either player can <code>ClaimDraw</code>.
            </p>

            <CodeBlock
                code={`checkWinner b mark =
    (match 0 1 2) || (match 3 4 5) || (match 6 7 8) ||  -- rows
    (match 0 3 6) || (match 1 4 7) || (match 2 5 8) ||  -- cols
    (match 0 4 8) || (match 2 4 6)                        -- diags`}
                language="haskell"
                filename="Win Check"
            />

            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                Each move is its own transaction on-chain.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Tic-Tac-Toe CLI Commands"
            />

            <h2 id="mental-model">Mental Model</h2>

            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                {`Player X tx          Player O tx          Player X tx
   │                    │                    │
   ▼                    ▼                    ▼
┌─────────┐      ┌─────────┐      ┌─────────┐
│ . . .   │      │ . . .   │      │ . . .   │
│ . X .   │ ──►  │ . X .   │ ──►  │ X X .   │  ...
│ . . .   │      │ . . O   │      │ . . O   │
└─────────┘      └─────────┘      └─────────┘
 Datum v1         Datum v2         Datum v3`}
            </pre>

            <p className="pexplaination pt-2">
                A note on the JSON: yes, the datum representation for 9 board cells is
                huge. In practice you'd use a helper library or off-chain Haskell code
                to generate these — nobody types them by hand. But seeing the raw
                constructors makes it clear what actually lives on the blockchain.
            </p>

        </div>
    );
}
