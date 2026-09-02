// 개발 중 확인용: 일본어 UI 텍스트 옆에 한글 직역을 작게 붙여서 보여준다.
// 실제 서비스에는 필요 없는 컴포넌트이니, 개발 확인이 끝나면 이 컴포넌트를 걷어내고
// 각 페이지에서 ja 텍스트만 남기면 된다.
export function JaKo({ ja, ko }: { ja: string; ko: string }) {
  return (
    <span className="[word-break:keep-all]">
      {ja}
      <span className="ml-1 whitespace-nowrap text-muted">({ko})</span>
    </span>
  );
}
