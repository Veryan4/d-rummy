import GUN from "gun";
import "gun/sea";
import "gun/axe";

const encryptKey = "#foo";
const db = GUN(["https://d-rummy-gun.herokuapp.com/gun"]);
const user = db.user().recall({ sessionStorage: true });

export const gunService = { getPlayersString, sendAction, getEventFromData, db, user };

function getPlayersString(players: string[]): string {
  return players.reduce((acc, player, i) => {
    if (i !== 0) {
      acc += "-";
    }
    acc += player;
    return acc;
  }, "");
}

async function sendAction(dbString: string, what: any): Promise<void> {
  const secret = await GUN.SEA.encrypt(what, encryptKey);
  const message = user.get("all").set({ what: secret });
  const index = new Date().toISOString();
  // @ts-ignore
  await db.get(dbString).get(index).put(message).then();
}

async function getEventFromData(data: any): Promise<any> {
  return {
    // transform the data
    who: await db.user(data as any).get("alias"),
    what: await GUN.SEA.decrypt(data.what, encryptKey),
    // @ts-ignore
    when: GUN.state.is(data, "what"),
  };
}
