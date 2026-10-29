export function useRouter() {
  return {
    push(path: string) {
      document.body.dataset.destination = path;
    },
  };
}

export function usePathname() {
  return location.pathname;
}
export function useSearchParams() {
  return new URLSearchParams(location.search);
}
