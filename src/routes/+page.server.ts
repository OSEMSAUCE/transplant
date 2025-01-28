export const ssr = false;

export const load = async () => {
  return {
    // temporarily remove database calls
    repositories: [],
  };
};
