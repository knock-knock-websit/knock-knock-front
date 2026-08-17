import { LoginPage } from "@/components/auth-pages";
import GuestRouteGuard from "@/components/guest-route-guard";
export const metadata = { title: "會員登入" };
export default function Page() {
  return <GuestRouteGuard><LoginPage /></GuestRouteGuard>;
}
