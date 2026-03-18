/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "gaming-matchmaker",
    title: "Gaming Matchmaker",
    subtitle: "A two-phase state machine for trustless player-vs-player wager matching",
    date: "2025-02-22T11:30:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "game", "state-machine", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=18",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "Gaming",

};

export default function GamingMatchmakerArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module GamingMatchmaker where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData,
                                            fromBuiltinData)
import           PlutusTx.Prelude          (Bool (False), Integer,
                                            traceIfFalse, (==), (&&), ($), (>=), (+))
import           Plutus.V1.Ledger.Value    (valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

-- Match goes through two phases:
-- Waiting: one player has deposited, waiting for someone to join
-- Matched: two players locked in, game in progress
data MatchState
    = Waiting
        { waitingPlayer :: PlutusV2.PubKeyHash
        , wagerAmount   :: Integer
        }
    | Matched
        { player1     :: PlutusV2.PubKeyHash
        , player2     :: PlutusV2.PubKeyHash
        , totalWager  :: Integer
        , arbiter     :: PlutusV2.PubKeyHash   -- oracle/game server for results
        }
PlutusTx.unstableMakeIsData ''MatchState

data MatchAction
    = JoinMatch
    | CancelMatch
    | DeclareWinner PlutusV2.PubKeyHash
    | DeclareDraw
PlutusTx.unstableMakeIsData ''MatchAction

{-# INLINABLE mkMatchmakerValidator #-}
mkMatchmakerValidator :: MatchState -> MatchAction -> PlutusV2.ScriptContext -> Bool
mkMatchmakerValidator state action ctx = case (state, action) of

    -- Second player joins
    (Waiting p1 wager, JoinMatch) ->
        traceIfFalse "Must deposit the matching wager amount!" 
            (outputAdaAmount >= wager + wager) &&
        traceIfFalse "Invalid match state transition!" validMatchTransition
      where
        validMatchTransition :: Bool
        validMatchTransition = case getContinuingOutputs ctx of
            [output] -> case PlutusV2.txOutDatum output of
                PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                    case fromBuiltinData rawDatum of
                        Just (Matched p1' p2' tw _) ->
                            p1' == p1 &&
                            tw  == wager + wager
                        _ -> False
                _ -> False
            _ -> False

        outputAdaAmount :: Integer
        outputAdaAmount = case getContinuingOutputs ctx of
            [output] -> valueOf (PlutusV2.txOutValue output)
                                PlutusV2.adaSymbol PlutusV2.adaToken
            _        -> 0

    -- Waiting player cancels before anyone joins
    (Waiting p1 _, CancelMatch) ->
        traceIfFalse "Only the waiting player can cancel!" 
            (PlutusV2.txSignedBy info p1)

    -- Arbiter declares a winner
    (Matched p1 p2 tw arb, DeclareWinner winner) ->
        traceIfFalse "Only the arbiter can declare a winner!" 
            (PlutusV2.txSignedBy info arb) &&
        traceIfFalse "Winner must be one of the two players!" 
            (winner == p1 || winner == p2) &&
        traceIfFalse "Winner must receive the full wager pool!" 
            (valueOf (PlutusV2.valuePaidTo info winner) 
                     PlutusV2.adaSymbol PlutusV2.adaToken >= tw)

    -- Arbiter declares a draw, each player gets half
    (Matched p1 p2 tw arb, DeclareDraw) ->
        traceIfFalse "Only the arbiter can declare a draw!" 
            (PlutusV2.txSignedBy info arb) &&
        traceIfFalse "Player 1 must receive their share!" 
            (valueOf (PlutusV2.valuePaidTo info p1) 
                     PlutusV2.adaSymbol PlutusV2.adaToken >= divide tw 2) &&
        traceIfFalse "Player 2 must receive their share!" 
            (valueOf (PlutusV2.valuePaidTo info p2) 
                     PlutusV2.adaSymbol PlutusV2.adaToken >= divide tw 2)

    -- Everything else is invalid
    _ -> traceIfFalse "Invalid state/action combination!" False

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkMatchmakerValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/matchmaker.plutus" validator
`;

    const bashCommands = `# 1. Player 1 creates a match with a 50 ADA wager
$ cardano-cli conway transaction build \\
  --tx-in 4a7b1c2d3e8f90a5b6c7d8e9f01234567890abcdef1234567890abcdef123456#0 \\
  --tx-out $(cat matchmaker.addr)+50000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"player1_pkh_aaa..."},{"int":50000000}]}' \\
  --change-address addr_test1_player1_address \\
  --testnet-magic 2 \\
  --out-file tx-create-match.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Player 2 joins — output must hold 100 ADA with Matched datum
$ cardano-cli conway transaction build \\
  --tx-in 1c2d3e8f90a5b6c7d8e9f01234567890abcdef1234567890abcdef1234564a7b#0 \\
  --tx-in-script-file matchmaker.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-in 8f90a5b6c7d8e9f01234567890abcdef1234567890abcdef1234564a7b1c2d3e#0 \\
  --tx-out $(cat matchmaker.addr)+100000000 \\
  --tx-out-inline-datum-value '{"constructor":1,"fields":[{"bytes":"player1_pkh_aaa..."},{"bytes":"player2_pkh_bbb..."},{"int":100000000},{"bytes":"arbiter_pkh_ccc..."}]}' \\
  --tx-in-collateral 5b6c7d8e9f01234567890abcdef1234567890abcdef1234564a7b1c2d3e8f90a#0 \\
  --change-address addr_test1_player2_address \\
  --testnet-magic 2 \\
  --out-file tx-join-match.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 3. Arbiter declares Player 1 the winner
$ cardano-cli conway transaction build \\
  --tx-in d8e9f01234567890abcdef1234567890abcdef1234564a7b1c2d3e8f90a5b6c7#0 \\
  --tx-in-script-file matchmaker.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 2, "fields": [{"bytes":"player1_pkh_aaa..."}]}' \\
  --tx-out addr_test1_player1_address+100000000 \\
  --required-signer-hash arbiter_pkh_ccc \\
  --tx-in-collateral 34567890abcdef1234567890abcdef1234564a7b1c2d3e8f90a5b6c7d8e9f012#0 \\
  --change-address addr_test1_arbiter_address \\
  --testnet-magic 2 \\
  --out-file tx-declare-winner.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-declare-winner.raw \\
  --signing-key-file ../../../keys/arbiter.skey \\
  --testnet-magic 2 \\
  --out-file tx-declare-winner.signed

$ cardano-cli conway transaction submit --tx-file tx-declare-winner.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                This is a matchmaking contract for head-to-head wager games. Player 1
                creates a match by depositing ADA. When Player 2 joins and deposits the
                same amount, the contract transitions to a locked state where only a
                designated arbiter can settle the outcome.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="GamingMatchmaker.hs"
            />
            <br />

            <h2 id="explanation">What's Going On</h2>

            <h3>State × Action pattern matching</h3>

            <p className="pexplaination">
                The validator pattern-matches on a tuple of (current state, action). This
                gives you a clean matrix of allowed transitions:
            </p>

            <CodeBlock
                code={`case (state, action) of
    (Waiting p1 wager, JoinMatch) -> ...    -- Phase 1 -> Phase 2
    (Waiting p1 _,     CancelMatch) -> ...  -- Phase 1 -> Cancel
    (Matched ...,      DeclareWinner w) -> ... -- Phase 2 -> End
    (Matched ...,      DeclareDraw) -> ...     -- Phase 2 -> End
    _ -> False  -- everything else rejected`}
                language="haskell"
                filename="Transition Matrix"
            />

            <p className="pexplaination">
                The wildcard <code>_</code> at the bottom catches invalid combos like
                trying to declare a winner during the Waiting phase, or trying to join
                a match that's already started. Haskell's exhaustive pattern matching
                makes this hard to get wrong.
            </p>

            <h3>The arbiter role</h3>

            <p className="pexplaination pt-2">
                Once both players are committed, only the <code>arbiter</code> can resolve
                the game. This would typically be an oracle monitoring the actual game
                off-chain (or on Hydra). The arbiter's <code>PubKeyHash</code> gets locked
                into the Matched datum, so players know upfront who judges.
            </p>

            <p className="pexplaination">
                Important: the arbiter controls <em>who</em> won, but not where the funds
                go. <code>DeclareWinner</code> forces the full pool to the winner.{" "}
                <code>DeclareDraw</code> forces an even split. The arbiter can't pocket
                anything.
            </p>

            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                Three distinct transactions: create match, join match, settle match.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Matchmaker CLI Commands"
            />

            <p className="pexplaination pt-2">
                If nobody joins your match, <code>CancelMatch</code> is available during
                the Waiting phase and requires the original player's signature. Once it
                transitions to Matched, cancellation is off the table — both
                players are committed.
            </p>

        </div>
    );
}
