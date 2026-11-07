import Link from "next/link";
import { AuthForm } from "../components/auth-form";
export default function Page() { return <><h1>Connexion</h1><AuthForm mode="connexion" /><p><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></p></>; }
