export const loader = async ({ request }) => {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  // User denied Twitch authorization
  if (error) {
    return Response.json({
      success: false,
      error,
    });
  }

  // Twitch did not send an authorization code
  if (!code) {
    return Response.json(
      {
        success: false,
        error: "Missing authorization code",
      },
      {
        status: 400,
      },
    );
  }

  return Response.json({
    success: true,
    message: "Twitch authorization code received",
  });
};