export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const payload = (await response
    .json()
    .catch(() => ({ error: "Phản hồi máy chủ không hợp lệ" }))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Không thể hoàn tất yêu cầu");
  }

  return payload as T;
}
