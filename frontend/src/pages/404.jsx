import Link from "next/link";
import { StateMessage } from "@/Components/Feedback";
import { SearchIcon } from "@/Components/Icons";
import UserLayout from "@/layout/UserLayout";

export default function NotFoundPage() {
  return (
    <UserLayout title="Page not found">
      <div style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }}>
        <div className="card">
          <StateMessage
            icon={<SearchIcon size={40} />}
            title="This page doesn't exist"
            description="The link may be broken, or the page may have been removed."
            action={
              <Link href="/" className="btn btn-primary btn-sm">
                Go to the home page
              </Link>
            }
          />
        </div>
      </div>
    </UserLayout>
  );
}
