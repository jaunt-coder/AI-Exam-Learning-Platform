docs/00-platform-constitution.md를 프로젝트 최상위 설계 문서로 등록한다.

앞으로 모든 개발은 이 문서를 최우선 기준으로 한다.

기존 감정평가사 회계학 전용 구조가 아니라
AI Exam Learning Platform v2 구조로 개발한다.

회계학은 첫 번째 Subject Template으로 구현한다.

새 기능 개발 전 반드시 관련 설계 문서를 확인한다.



docs/01-architecture-spec.md를 참조 문서로 등록한다.

앞으로 프로젝트 구조와 기능 개발은
00-platform-constitution.md와
01-architecture-spec.md를 동시에 기준으로 한다.

기존 회계학 전용 구조가 있다면
AI Exam Learning Platform v2 구조에 맞게 점진적으로 전환한다.

새 파일 생성 전 반드시 Architecture Layer 위치를 판단한다.



docs/02-database-spec.md를 데이터 설계 기준 문서로 등록한다.

앞으로 생성하는 모든 JSON 데이터는 반드시
02-database-spec.md의 Schema를 따른다.

master-db.json을 Single Source of Truth로 사용한다.

화면용 데이터나 임시 JSON을 별도로 만들지 않는다.

새로운 과목, 단원, 패턴, 문제 추가 시
Master Database 구조에 맞게 설계한다.
