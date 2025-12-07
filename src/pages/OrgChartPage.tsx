// src/pages/OrgChartPage.tsx
import React, {
  useState,
  useLayoutEffect,
  useRef,
} from "react";
import "./OrgChartPage.css";

type OrgNode = {
  id: string;
  name: string;
  position: string;
  children?: OrgNode[];
};

type Department = {
  id: string;
  name: string;
  description: string;
  tree: OrgNode;
};

const departments: Department[] = [
  {
    id: "total",
    name: "총무팀",
    description: "사내 행정과 자산 관리를 담당합니다.",
    tree: {
      id: "total-root",
      name: "김민수",
      position: "총무팀장",
      children: [
        {
          id: "total-1",
          name: "이수진",
          position: "행정 파트장",
          children: [
            {
              id: "total-1-1",
              name: "박상호",
              position: "행정 주임",
            },
            {
              id: "total-1-2",
              name: "정혜린",
              position: "행정 사원",
            },
            {
              id: "total-1-3",
              name: "노은지",
              position: "행정 인턴",
            },
          ],
        },
        {
          id: "total-2",
          name: "윤지민",
          position: "시설 파트장",
          children: [
            {
              id: "total-2-1",
              name: "오지우",
              position: "시설 사원",
            },
            {
              id: "total-2-2",
              name: "배태현",
              position: "시설 사원",
            },
          ],
        },
        {
          id: "total-3",
          name: "강도윤",
          position: "비품·예산 담당",
          children: [
            {
              id: "total-3-1",
              name: "최다인",
              position: "비품 관리 사원",
            },
          ],
        },
      ],
    },
  },
  {
    id: "plan",
    name: "기획팀",
    description: "회사 방향성과 서비스를 설계합니다.",
    tree: {
      id: "plan-root",
      name: "이지은",
      position: "기획팀장",
      children: [
        {
          id: "plan-1",
          name: "최동욱",
          position: "서비스 기획 리더",
          children: [
            {
              id: "plan-1-1",
              name: "김다운",
              position: "서비스 기획 대리",
            },
            {
              id: "plan-1-2",
              name: "송지민",
              position: "서비스 기획 주임",
            },
          ],
        },
        {
          id: "plan-2",
          name: "유서준",
          position: "사업전략 리더",
          children: [
            {
              id: "plan-2-1",
              name: "박해린",
              position: "전략 분석 사원",
            },
            {
              id: "plan-2-2",
              name: "임지호",
              position: "시장조사 사원",
            },
          ],
        },
        {
          id: "plan-3",
          name: "문하진",
          position: "데이터 기획 리더",
          children: [
            {
              id: "plan-3-1",
              name: "정가온",
              position: "데이터 기획 대리",
            },
          ],
        },
      ],
    },
  },
  {
    id: "marketing",
    name: "마케팅팀",
    description: "브랜드를 알리고 성장시키는 일을 합니다.",
    tree: {
      id: "mk-root",
      name: "박서준",
      position: "마케팅팀장",
      children: [
        {
          id: "mk-1",
          name: "한유진",
          position: "브랜드 마케터",
          children: [
            {
              id: "mk-1-1",
              name: "조민아",
              position: "콘텐츠 마케터",
            },
            {
              id: "mk-1-2",
              name: "정유라",
              position: "SNS 마케터",
            },
          ],
        },
        {
          id: "mk-2",
          name: "이하린",
          position: "디지털 마케팅 리더",
          children: [
            {
              id: "mk-2-1",
              name: "김도경",
              position: "퍼포먼스 마케터",
            },
            {
              id: "mk-2-2",
              name: "우지현",
              position: "광고 운영 사원",
            },
          ],
        },
        {
          id: "mk-3",
          name: "노지후",
          position: "프로모션 담당",
        },
      ],
    },
  },
  {
    id: "hr",
    name: "인사팀",
    description: "사람과 조직 문화를 책임지는 부서입니다.",
    tree: {
      id: "hr-root",
      name: "최유진",
      position: "인사팀장",
      children: [
        {
          id: "hr-1",
          name: "유하늘",
          position: "인사운영 리더",
          children: [
            {
              id: "hr-1-1",
              name: "강은채",
              position: "급여·평가 담당",
            },
            {
              id: "hr-1-2",
              name: "김태윤",
              position: "근태 관리 사원",
            },
          ],
        },
        {
          id: "hr-2",
          name: "문지호",
          position: "채용 리더",
          children: [
            {
              id: "hr-2-1",
              name: "이세준",
              position: "채용 담당 사원",
            },
            {
              id: "hr-2-2",
              name: "오지민",
              position: "인턴",
            },
          ],
        },
        {
          id: "hr-3",
          name: "박예린",
          position: "조직문화 담당",
          children: [
            {
              id: "hr-3-1",
              name: "신다영",
              position: "사내 프로그램 기획",
            },
          ],
        },
      ],
    },
  },
  {
    id: "finance",
    name: "재무팀",
    description: "회사의 재무 건전성을 관리합니다.",
    tree: {
      id: "fin-root",
      name: "정하늘",
      position: "재무팀장",
      children: [
        {
          id: "fin-1",
          name: "김도훈",
          position: "회계 파트장",
          children: [
            {
              id: "fin-1-1",
              name: "장도연",
              position: "회계 주임",
            },
            {
              id: "fin-1-2",
              name: "우민서",
              position: "회계 사원",
            },
          ],
        },
        {
          id: "fin-2",
          name: "이현지",
          position: "자금관리 담당",
          children: [
            {
              id: "fin-2-1",
              name: "박진호",
              position: "현금·계좌 관리",
            },
          ],
        },
        {
          id: "fin-3",
          name: "서하영",
          position: "예산기획 담당",
        },
      ],
    },
  },
  {
    id: "dev",
    name: "개발팀",
    description: "제품과 서비스를 실제로 구현하는 핵심 조직입니다.",
    tree: {
      id: "dev-root",
      name: "오지훈",
      position: "개발본부장",
      children: [
        {
          id: "dev-fe-lead",
          name: "이도윤",
          position: "프론트엔드 리드",
          children: [
            {
              id: "dev-fe-sub",
              name: "최하늘",
              position: "프론트엔드 대리",
              children: [
                {
                  id: "dev-fe-1",
                  name: "문지후",
                  position: "프론트엔드 사원",
                },
                {
                  id: "dev-fe-2",
                  name: "박시온",
                  position: "프론트엔드 인턴",
                },
              ],
            },
          ],
        },
        {
          id: "dev-fe-main",
          name: "양서준",
          position: "프론트엔드 주임",
        },
        {
          id: "dev-be-lead",
          name: "김현우",
          position: "백엔드 리드",
          children: [
            {
              id: "dev-be-1",
              name: "유다현",
              position: "백엔드 대리",
            },
            {
              id: "dev-be-2",
              name: "전하린",
              position: "백엔드 사원",
            },
          ],
        },
        {
          id: "dev-infra",
          name: "박성민",
          position: "인프라 리더",
          children: [
            {
              id: "dev-infra-1",
              name: "강시우",
              position: "시스템 엔지니어",
            },
            {
              id: "dev-infra-2",
              name: "최민재",
              position: "모니터링 담당",
            },
          ],
        },
        {
          id: "dev-ai",
          name: "노민재",
          position: "AI 리더",
          children: [
            {
              id: "dev-ai-1",
              name: "이서우",
              position: "AI 엔지니어",
            },
            {
              id: "dev-ai-2",
              name: "하은지",
              position: "MLOps 엔지니어",
            },
          ],
        },
      ],
    },
  },
  {
    id: "sales",
    name: "영업팀",
    description: "고객과 가장 먼저 만나 회사 성장을 이끌습니다.",
    tree: {
      id: "sales-root",
      name: "한예린",
      position: "영업팀장",
      children: [
        {
          id: "sales-1",
          name: "조현수",
          position: "B2B 영업 리더",
          children: [
            {
              id: "sales-1-1",
              name: "이서영",
              position: "영업 대리",
            },
            {
              id: "sales-1-2",
              name: "김재윤",
              position: "영업 사원",
            },
          ],
        },
        {
          id: "sales-2",
          name: "박도연",
          position: "파트너 영업 리더",
          children: [
            {
              id: "sales-2-1",
              name: "오채린",
              position: "채널 관리 주임",
            },
            {
              id: "sales-2-2",
              name: "유도현",
              position: "제휴 운영 사원",
            },
          ],
        },
        {
          id: "sales-3",
          name: "임가온",
          position: "인사이드 세일즈",
        },
      ],
    },
  },
  {
    id: "legal",
    name: "법무팀",
    description: "회사의 법적 리스크를 관리하고 보호합니다.",
    tree: {
      id: "legal-root",
      name: "윤도현",
      position: "법무팀장",
      children: [
        {
          id: "legal-1",
          name: "이서율",
          position: "계약 담당",
          children: [
            {
              id: "legal-1-1",
              name: "정주원",
              position: "계약 검토 사원",
            },
          ],
        },
        {
          id: "legal-2",
          name: "김하린",
          position: "컴플라이언스 리더",
          children: [
            {
              id: "legal-2-1",
              name: "노미아",
              position: "규정 관리 사원",
            },
            {
              id: "legal-2-2",
              name: "박예준",
              position: "교육 담당 사원",
            },
          ],
        },
      ],
    },
  },
];

function findFirstMatchNode(
  node: OrgNode,
  predicate: (n: OrgNode) => boolean
): OrgNode | null {
  if (predicate(node)) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findFirstMatchNode(child, predicate);
    if (found) return found;
  }
  return null;
}

const OrgChartPage: React.FC = () => {
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    departments[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null
  );

  // 트리 스케일링(한 화면 안에 맞추기)
  const treeWrapperRef = useRef<HTMLDivElement | null>(null);
  const treeContentRef = useRef<HTMLDivElement | null>(null);
  const [treeScale, setTreeScale] = useState(1);

  const selectedDept = departments.find(
    (dept) => dept.id === selectedDeptId
  )!;

  // 🔍 검색 핸들러 (useEffect 대신 이벤트 핸들러에서 state 변경)
  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const trimmed = value.trim();

    setSearchQuery(value);

    if (!trimmed) {
      setHighlightedNodeId(null);
      return;
    }

    for (const dept of departments) {
      const found = findFirstMatchNode(
        dept.tree,
        (node) =>
          node.name.includes(trimmed) ||
          node.position.includes(trimmed)
      );
      if (found) {
        setSelectedDeptId(dept.id);
        setHighlightedNodeId(found.id);
        return;
      }
    }

    // 못 찾으면 하이라이트 제거
    setHighlightedNodeId(null);
  };

  // 트리 스케일 계산 (부서 바뀌거나 창 크기 바뀔 때마다)
  useLayoutEffect(() => {
    const updateScale = () => {
      const wrapper = treeWrapperRef.current;
      const content = treeContentRef.current;
      if (!wrapper || !content) return;

      const wrapperWidth = wrapper.getBoundingClientRect().width;
      const contentWidth = content.scrollWidth;

      if (!wrapperWidth || !contentWidth) return;

      const nextScale = Math.min(
        1,
        wrapperWidth / (contentWidth + 24) // 약간 여유 padding
      );
      setTreeScale(nextScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [selectedDeptId]);

  const handleReset = () => {
    setSearchQuery("");
    setSelectedDeptId(departments[0].id);
    setHighlightedNodeId(null);
  };

  const renderBranch = (
    node: OrgNode,
    isRoot: boolean
  ): React.ReactNode => {
    const nodeClasses = [
      "org-node-card",
      isRoot ? "org-node-root" : "",
      highlightedNodeId === node.id ? "org-node-highlight" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="org-branch" key={node.id}>
        <div className={nodeClasses}>
          <span className="org-node-name">{node.name}</span>
          <span className="org-node-position">{node.position}</span>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="org-branch-children">
            <div className="org-branch-horizontal-line" />
            <div className="org-branch-children-row">
              {node.children.map((child) => (
                <div className="org-branch-child" key={child.id}>
                  {renderBranch(child, false)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="dashboard-content orgchart-layout">
      <div className="orgchart-header">
        <div className="orgchart-header-text">
          <h1 className="orgchart-title">조직도</h1>
          <p className="orgchart-subtitle">
            회사 조직도와 팀원 구성을 한눈에 확인하세요.
          </p>
        </div>

        <div className="orgchart-header-actions">
          <input
            type="text"
            placeholder="이름 또는 부서 검색"
            className="orgchart-search-input"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <button
            type="button"
            className="orgchart-reset-btn"
            onClick={handleReset}
          >
            필터 초기화
          </button>
        </div>
      </div>

      <section className="orgchart-body">
        {/* 왼쪽 부서 목록 */}
        <aside className="orgchart-side-panel">
          <ul className="orgchart-dept-list">
            {departments.map((dept) => (
              <li
                key={dept.id}
                className={
                  dept.id === selectedDeptId
                    ? "orgchart-dept-item active"
                    : "orgchart-dept-item"
                }
                onClick={() => setSelectedDeptId(dept.id)}
              >
                <span className="dept-name-main">{dept.name}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* 오른쪽 조직도 트리 */}
        <div className="orgchart-tree-panel">
          <div className="orgchart-tree-inner">
            <header className="orgchart-tree-header">
              <h2 className="orgchart-tree-title">
                {selectedDept.name}
              </h2>
              <p className="orgchart-tree-subtitle">
                {selectedDept.description}
              </p>
            </header>

            <div
              ref={treeWrapperRef}
              className="org-tree-wrapper"
            >
              <div
                ref={treeContentRef}
                className="org-tree-scale"
                style={{
                  transform: `scale(${treeScale})`,
                  transformOrigin: "top center",
                }}
              >
                <div className="org-tree-root">
                  {renderBranch(selectedDept.tree, true)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default OrgChartPage;
