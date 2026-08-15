import RoomClient from "@/components/RoomClient";

export default function RoomPage({ params }) {
  return <RoomClient code={params.code.toUpperCase()} />;
}
