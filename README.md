# High Noon

서부 풍 **반응 속도 결투** 모바일 게임입니다.  
Expo + React Native(Expo Router)로 제작되었습니다.

**저장소:** [github.com/gyu-bin/High-noon](https://github.com/gyu-bin/High-noon)

## 플레이 모드

| 모드 | 설명 |
|------|------|
| **vs NPC** | 20단계 NPC와 하트제 대결. 단계별 난이도·보스 연출. |
| **2인 대결** | 한 기기에서 P1 / P2가 위·아래 반으로 나뉘어 같은 박자에 반응. 3·5·7판 선승 프리셋. |
| **기록** | 전체 평균 반응(ms), NPC 클리어 수. |

## 주요 기능

- Ready → Steady → **Bang!** 박자에 맞춘 반응 측정(얼리·타임아웃·반응 ms)
- 효과음·진동·로컬 2인 판수 설정(메뉴에서 토글, AsyncStorage 유지)
- 태블릿 등 큰 화면에서도 고정 뷰포트(`PhoneStageShell`)로 동일한 플레이 크기
- NPC 매치 종료 후 **NPC 선택** 화면으로 복귀
- 접근성: 주요 버튼·NPC 카드·일시정지 모달 레이블/힌트

## 시작하기

요구 사항: **Node.js(LTS 권장)**, **npm**, [Expo Go](https://expo.dev/go) 또는 iOS Simulator / Android Emulator.

```bash
npm install
npx expo start
```

- iOS: `i` 또는 Xcode 시뮬레이터  
- Android: `a` 또는 에뮬레이터  
- 웹: `w` (일부 네이티브 기능은 제한될 수 있음)

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm start` | Expo 개발 서버 |
| `npm run ios` / `npm run android` / `npm run web` | 플랫폼별 실행 |
| `npm run lint` | ESLint(Expo 설정) |

## 기술 스택

- **Expo SDK 54** · **expo-router** · **TypeScript**
- **Zustand** (진행도·게임·설정)
- **expo-audio** · **expo-haptics** · **expo-speech** · **expo-image**

## 라이선스

Private 프로젝트이면 저장소 설정에 맞게 수정하세요.
