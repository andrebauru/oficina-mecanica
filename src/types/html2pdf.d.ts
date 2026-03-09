declare module 'html2pdf.js' {
  interface Options {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: Record<string, unknown>;
  }
  interface Html2PdfInstance {
    set(options: Options): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    toPdf(): Html2PdfInstance;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(key: string): Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output(type: string): Promise<any>;
    save(): void;
  }
  function html2pdf(): Html2PdfInstance;
  export = html2pdf;
}
