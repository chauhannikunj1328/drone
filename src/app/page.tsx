import { Shell } from "@/components/Shell";
import { ProtoProvider } from "@/lib/store";

export default function Home() {
  return (
    <ProtoProvider>
      <Shell />
    </ProtoProvider>
  );
}
