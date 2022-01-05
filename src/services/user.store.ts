let user: string | null;

async function setUser(nextUser: string | null) {
  user = nextUser;
  await window.dispatchEvent(
    new CustomEvent("update-user", {
      detail: { user },
      bubbles: true,
      composed: true,
    })
  );
}

function getUser(): string | null {
  return user;
}

export const userStore = { setUser, getUser };
