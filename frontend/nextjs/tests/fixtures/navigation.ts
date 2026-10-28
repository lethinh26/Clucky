export function useRouter() {
  return {
    push(path: string) {
      document.body.dataset.destination = path;
    },
  };
}
