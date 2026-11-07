import Link from "next/link";
import { AuthForm } from "../components/auth-form";
export default function Page() { return <><h1>Mot de passe oublié</h1><AuthForm mode="oubli" /><p><Link href="/connexion">Retour à la connexion</Link></p></>; }
