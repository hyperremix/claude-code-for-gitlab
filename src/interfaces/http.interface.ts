export interface IHttpClient {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}
