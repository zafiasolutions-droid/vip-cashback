import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [useCashback, setUseCashback] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');

  useEffect(() => {
    async function loadCashback() {
      try {
        const token = await shopify.sessionToken.get();

        const response = await fetch(
          'https://vip-cashback.onrender.com/api/cashback/balance',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || 'Unable to load cashback balance.'
          );
        }

        setCashbackBalance(
          Number(data.cashbackBalance ?? 0)
        );
      } catch (err) {
        console.error('Cashback checkout error:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load cashback balance.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadCashback();
  }, []);
/**
 * @param {any} event
 */
  function handleCashbackToggle(event) {
    const target = event.currentTarget;

    if (!target) {
      return;
    }

    const checked = target.checked;

    setUseCashback(checked);

    if (!checked) {
      setRedeemAmount('');
    }
  }
/**
 * @param {any} event
 */
  function handleRedeemAmountChange(event) {
    const target = event.currentTarget;

    if (!target) {
      return;
    }

    const value = target.value;

    if (value === '') {
      setRedeemAmount('');
      return;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }

    // Customer available cashback balance se zyada use nahi kar sakta
    const validAmount = Math.min(
      amount,
      cashbackBalance
    );

    setRedeemAmount(String(validAmount));
  }

  const selectedCashback = Math.min(
    Math.max(Number(redeemAmount) || 0, 0),
    cashbackBalance
  );

  return (
    <s-banner heading="VIP Cashback">
      {isLoading && !error && (
        <s-text>
          Loading your cashback balance...
        </s-text>
      )}

      {!!error && (
        <s-text>
          Unable to load cashback balance: {error}
        </s-text>
      )}

      {!isLoading && !error && (
        <s-stack gap="base">
          <s-text>
            Your available cashback balance
          </s-text>

          <s-heading>
            ${cashbackBalance.toFixed(2)}
          </s-heading>

          {cashbackBalance > 0 && (
            <>
              <s-checkbox
                label="Use my cashback"
                checked={useCashback}
                onChange={handleCashbackToggle}
              />

              {useCashback && (
                <>
                  <s-text-field
                    label="Cashback amount to use"
                  
                    value={redeemAmount}
                    onInput={handleRedeemAmountChange}
                  />

                  {selectedCashback > 0 && (
                    <s-text>
                      Cashback selected: $
                      {selectedCashback.toFixed(2)}
                    </s-text>
                  )}

                  <s-text>
                    Maximum available: $
                    {cashbackBalance.toFixed(2)}
                  </s-text>
                </>
              )}
            </>
          )}

          {cashbackBalance > 0 ? (
            <s-text>
              You have cashback available to use on eligible purchases.
            </s-text>
          ) : (
            <s-text>
              You currently have no cashback available.
            </s-text>
          )}
        </s-stack>
      )}
    </s-banner>
  );
}