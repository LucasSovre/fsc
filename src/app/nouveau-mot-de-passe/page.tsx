import Link from "next/link";
import { AuthForm } from "../components/auth-form";
export default function Page() { return <><h1>Nouveau mot de passe</h1><AuthForm mode="nouveau" /><p><Link href="/connexion">Se connecter</Link></p></>; }
