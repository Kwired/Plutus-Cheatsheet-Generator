import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "gaming-matchmaker",
    title: "Gaming Matchmaker",
    subtitle: "Players deposit wagers and the contract pairs them into a trustless head-to-head match",
    date: "2025-02-23T14:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "game", "state-machine", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=18",
    },
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

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The match state goes through phases: 
-- Waiting (one player deposited, waiting for opponent)
-- Matched (two players locked in, game can begin)

data MatchState
    = Waiting
        { waitingPlayer :: PlutusV2.PubKeyHash
        , wagerAmount   :: Integer
        }
    | Matched
        { player1     :: PlutusV2.PubKeyHash
        , player2     :: PlutusV2.PubKeyHash
        , totalWager  :: Integer
        , arbiter     :: PlutusV2.PubKeyHash   -- Trusted oracle/game server for results
        }
PlutusTx.unstableMakeIsData ''MatchState

-- Actions a user can take
data MatchAction
    = JoinMatch                          -- Second player joins
    | CancelMatch                        -- Waiting player cancels
    | DeclareWinner PlutusV2.PubKeyHash  -- Arbiter declares the winner
    | DeclareDraw                        -- Arbiter declares a draw
PlutusTx.unstableMakeIsData ''MatchAction

{-# INLINABLE mkMatchmakerValidator #-}
mkMatchmakerValidator :: MatchState -> MatchAction -> PlutusV2.ScriptContext -> Bool
mkMatchmakerValidator state action ctx = case (state, action) of

    -- PHASE 1 -> PHASE 2: A second player joins the waiting match
    (Waiting p1 wager, JoinMatch) ->
        -- Second player must deposit the same wager
        traceIfFalse "Must deposit the matching wager amount!" 
            (outputAdaAmount >= wager + wager) &&
        -- State must transition to Matched with both players
        traceIfFalse "Invalid match state transition!" validMatchTransition
      where
        validMatchTransition :: Bool
        validMatchTransition = case getContinuingOutputs ctx of
            [output] -> case PlutusV2.txOutDatum output of
                PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                    case fromBuiltinData rawDatum of
                        Just (Matched p1' p2' tw _) ->
                            p1' == p1 &&            -- Original player preserved
                            tw  == wager + wager    -- Total is both wagers combined
                        _ -> False
                _ -> False
            _ -> False

        outputAdaAmount :: Integer
        outputAdaAmount = case getContinuingOutputs ctx of
            [output] -> valueOf (PlutusV2.txOutValue output)
                                PlutusV2.adaSymbol PlutusV2.adaToken
            _        -> 0

    -- CANCEL: Only the waiting player can withdraw before a match is made
    (Waiting p1 _, CancelMatch) ->
        traceIfFalse "Only the waiting player can cancel!" 
            (PlutusV2.txSignedBy info p1)

    -- WINNER: The arbiter declares who won and the winner takes everything
    (Matched p1 p2 tw arb, DeclareWinner winner) ->
        traceIfFalse "Only the arbiter can declare a winner!" 
            (PlutusV2.txSignedBy info arb) &&
        traceIfFalse "Winner must be one of the two players!" 
            (winner == p1 || winner == p2) &&
        traceIfFalse "Winner must receive the full wager pool!" 
            (valueOf (PlutusV2.valuePaidTo info winner) 
                     PlutusV2.adaSymbol PlutusV2.adaToken >= tw)

    -- DRAW: Arbiter declares a draw, each player gets half back
    (Matched p1 p2 tw arb, DeclareDraw) ->
        traceIfFalse "Only the arbiter can declare a draw!" 
            (PlutusV2.txSignedBy info arb) &&
        traceIfFalse "Player 1 must receive their share!" 
            (valueOf (PlutusV2.valuePaidTo info p1) 
                     PlutusV2.adaSymbol PlutusV2.adaToken >= divide tw 2) &&
        traceIfFalse "Player 2 must receive their share!" 
            (valueOf (PlutusV2.valuePaidTo info p2) 
                     PlutusV2.adaSymbol PlutusV2.adaToken >= divide tw 2)

    -- Any other state/action combination is invalid
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

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/matchmaker.plutus" validator
`;

    const bashCommands = `# 1. Player 1 creates a match with a 50 ADA wager (Waiting state)
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat matchmaker.addr)+50000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"player1_pkh_aaa..."},{"int":50000000}]}' \\
  --change-address addr_test1_player1_address \\
  --testnet-magic 2 \\
  --out-file tx-create-match.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Player 2 joins! Transitions from Waiting -> Matched
# The output must now hold 100 ADA (both wagers) and the Matched datum
$ cardano-cli conway transaction build \\
  --tx-in dummy_match_utxo_hash_2222222222222222#0 \\
  --tx-in-script-file matchmaker.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-in dummy_player2_funding_utxo_333333333#0 \\
  --tx-out $(cat matchmaker.addr)+100000000 \\
  --tx-out-inline-datum-value '{"constructor":1,"fields":[{"bytes":"player1_pkh_aaa..."},{"bytes":"player2_pkh_bbb..."},{"int":100000000},{"bytes":"arbiter_pkh_ccc..."}]}' \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_4444#0 \\
  --change-address addr_test1_player2_address \\
  --testnet-magic 2 \\
  --out-file tx-join-match.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 3. Arbiter declares Player 1 the winner — 100 ADA goes to Player 1
$ cardano-cli conway transaction build \\
  --tx-in dummy_matched_utxo_hash_5555555555555#0 \\
  --tx-in-script-file matchmaker.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 2, "fields": [{"bytes":"player1_pkh_aaa..."}]}' \\
  --tx-out addr_test1_player1_address+100000000 \\
  --required-signer-hash arbiter_pkh_ccc \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_6666#0 \\
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
                In most online games, matchmaking is handled by a centralized server that
                you have to trust. What if the server goes down? What if it cheats? On
                Cardano, we can build a <strong>trustless matchmaker</strong> that holds
                wagers in a smart contract and only releases them based on verifiable
                game outcomes.
            </p>

            <p>
                The <strong>Gaming Matchmaker</strong> uses a two-phase state machine.
                First, a player creates a match and deposits their wager (Waiting phase).
                When a second player joins and deposits the same amount, the contract
                transitions to Matched. From there, a designated arbiter (an oracle or
                game server) can declare a winner or a draw.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="GamingMatchmaker.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>Two-Phase State Machine</h3>

            <p className="pexplaination">
                This contract uses algebraic data types to represent its lifecycle. The{" "}
                <code>MatchState</code> has two constructors: <code>Waiting</code> (one
                player, waiting for opponent) and <code>Matched</code> (both players locked
                in). The validator pattern-matches on <em>both</em> the current state and
                the action simultaneously.
            </p>

            <CodeBlock
                code={`case (state, action) of
    (Waiting p1 wager, JoinMatch) -> ...    -- Phase 1 → Phase 2
    (Waiting p1 _,     CancelMatch) -> ...  -- Phase 1 → Cancel
    (Matched ...,      DeclareWinner w) -> ... -- Phase 2 → End
    (Matched ...,      DeclareDraw) -> ...     -- Phase 2 → End
    _ -> False  -- Everything else is illegal`}
                language="haskell"
                filename="State × Action Matrix"
            />

            <p className="pexplaination">
                This is the power of Haskell's type system. By matching on tuples of
                (state, action), we get a clean matrix of allowed transitions. The
                wildcard <code>_</code> at the bottom catches every invalid combination —
                like trying to <code>DeclareWinner</code> during the Waiting phase or
                trying to <code>JoinMatch</code> after the game already started.
            </p>

            <h3>The Arbiter Pattern</h3>

            <p className="pexplaination pt-2">
                Once two players are matched, only a designated <code>arbiter</code> can
                settle the game. This is typically an oracle that monitors the actual
                game being played off-chain (or on a Hydra L2). The arbiter's{" "}
                <code>PubKeyHash</code> is locked into the datum during the Matched
                phase, so players know upfront who will judge the outcome.
            </p>

            <p className="pexplaination">
                The validator still enforces <em>fair distribution</em> — even the
                arbiter can't pocket the funds. <code>DeclareWinner</code> forces the
                full pool to the winner's address. <code>DeclareDraw</code> forces an
                even split. The arbiter only controls <em>who</em> won, not <em>where
                the money goes</em>.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                The lifecycle has three distinct transactions: create match, join match,
                and settle match. Each one is a separate on-chain interaction.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Matchmaker CLI Commands"
            />

            <h3>Cancel Safety</h3>

            <p className="pexplaination pt-2">
                What if nobody joins your match? The <code>CancelMatch</code> action is
                exclusively available during the <code>Waiting</code> phase and requires
                the original player's signature. Once the match transitions to{" "}
                <code>Matched</code>, cancellation is no longer possible — both players
                are committed and only the arbiter can resolve it.
            </p>

        </div>
    );
}
