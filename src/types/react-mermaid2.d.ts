declare module "react-mermaid2" {
  import * as React from "react";

  export interface MermaidProps {
    /** Mermaid 記法のチャート文字列 */
    chart: string;
    /** mermaid.initialize の第二引数相当（任意） */
    config?: Record<string, unknown>;
    /** svg 要素に付ける id （任意） */
    name?: string;
    /** className / style も一応渡せるようにしておく（任意） */
    className?: string;
    style?: React.CSSProperties;
  }

  const Mermaid: React.FC<MermaidProps>;
  export default Mermaid;
}
