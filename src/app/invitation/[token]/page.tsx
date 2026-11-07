import Link from "next/link";
import { session } from "../../../server/session";
import { ActionForm } from "../../components/action-form";
import { acceptInvitationAction } from "../../actions";
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params, current = await session();
  const back = encodeURIComponent(`/invitation/${token}`);
  return <><h1>Rejoindre un calendrier commun</h1><p>Cette invitation est personnelle, valable sept jours et utilisable une seule fois. Tu partageras les noms de tes tags ; tes événements solo restent privés.</p>
    {current?.user.emailVerified ? <ActionForm action={acceptInvitationAction}><input type="hidden" name="token" value={token} /><p>Compte utilisé : {current.user.email}</p><button>Accepter l’invitation</button></ActionForm> : <><p>Connecte-toi avec l’adresse e-mail invitée et vérifiée. Si tu n’as pas de compte, demande à l’administrateur de le créer.</p><p><Link href={`/connexion?retour=${back}`}>Se connecter</Link></p></>}
  </>;
}
