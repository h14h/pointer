// Clerk is the identity provider. CLERK_JWT_ISSUER_DOMAIN is set on the
// Convex deployment (Convex dashboard → Settings → Environment Variables)
// and must match the issuer of the Clerk "convex" JWT template.
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
