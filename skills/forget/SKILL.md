---
name: forget
description: 특정 메모리를 삭제합니다
user-invocable: true
---

# Forget Skill

특정 메모리를 삭제합니다.

## 사용법

```
/forget <memory-id>
/forget all          # 전체 삭제 (확인 필요)
```

## 동작

1. 메모리 ID로 파일 찾기
2. 삭제 전 내용 확인 표시
3. 사용자 확인 후 삭제
4. 삭제 완료 메시지

## 주의사항

- 삭제된 메모리는 복구할 수 없습니다
- `all` 옵션은 신중하게 사용하세요
