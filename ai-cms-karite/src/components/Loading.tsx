type LoadingProps = {
  text?: string;
};

export function Loading({ text = "Cargando..." }: LoadingProps) {
  return (
    <div
      style={{
        minHeight: "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#163d2d",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

export default Loading;