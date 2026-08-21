
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  const [cashbackBalance, setCashbackBalance] = useState(0);
const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
        setIsLoading(false);
      } catch (err) {
        console.error('Cashback checkout error:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load cashback balance.'
        );
        setIsLoading(false);
      }
    }

    loadCashback();
  }, []);

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