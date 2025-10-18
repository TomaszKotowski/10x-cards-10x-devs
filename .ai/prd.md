# Dokument wymagań produktu (PRD) - Fiszki AI

## 1. Przegląd produktu

Fiszki AI to webowa aplikacja dla studentów uczelni wyższych, ułatwiająca szybkie tworzenie i naukę materiału przy użyciu fiszek w metodzie spaced repetition. Aplikacja umożliwia generowanie fiszek przez AI na podstawie wklejonego tekstu oraz ręczne tworzenie fiszek, organizowanie ich w talie i naukę w trybie powtórek z prostym algorytmem oceny odpowiedzi.

Cel produktu:

- Zmniejszyć czas i wysiłek potrzebny do tworzenia wartościowych fiszek.
- Zwiększyć adopcję efektywnej metody nauki opartej o powtórki rozłożone w czasie.

Grupa docelowa:

- Studenci uczelni wyższych przygotowujący się do egzaminów, kolokwiów i projektów.

Platforma i technologia:

- Web (desktop i mobile web w przeglądarce).
- System kont i uwierzytelnianie przez Supabase (email/hasło).
- AI dla generowania fiszek na podstawie tekstu.
- Brak modelu płatności w MVP.

Kluczowe wyróżniki:

- Generacja fiszek przez AI z wklejonego materiału (do 10 000 znaków).
- Przejrzysty, szybki flow akceptacji i edycji fiszek.
- Prosty, zrozumiały tryb nauki z dwoma przyciskami oceny.

## 2. Problem użytkownika

Tworzenie wysokiej jakości fiszek jest czasochłonne, a konsekwentne stosowanie metody spaced repetition wymaga dyscypliny i narzędzi. Studenci często rezygnują z fiszek, bo:

- Ręczne destylowanie materiału do pytań i odpowiedzi zajmuje dużo czasu.
- Brakuje prostego narzędzia łączącego generowanie treści i naukę.
- Istniejące narzędzia bywają złożone i mają stromy próg wejścia.

Fiszki AI usuwa te bariery, pozwalając szybko wygenerować fiszki, łatwo je poprawić i natychmiast zacząć naukę.

## 3. Wymagania funkcjonalne

3.1. Uwierzytelnianie i konta (Supabase)

- Rejestracja email/hasło, logowanie, wylogowanie.
- Reset hasła przez email.
- Tylko właściciel ma dostęp do swoich talii i fiszek.
- Sesja użytkownika utrzymywana w bezpieczny sposób (tokeny Supabase).

  3.2. Generowanie fiszek przez AI

- Pole tekstowe na wklejenie treści do 10 000 znaków (licznik znaków i walidacja).
- Przycisk uruchamiający generowanie; limit 15 generacji na użytkownika na ruchome 24h.
- W przypadku błędu AI czy limitu – czytelny komunikat i możliwość ponownej próby po spełnieniu warunków.
- Prezentacja wygenerowanych fiszek w formacie Pytanie/Odpowiedź.

  3.3. Przegląd, edycja i akceptacja wygenerowanych fiszek

- Lista fiszek z możliwością edycji treści.
- Akceptacja lub odrzucenie pojedynczych fiszek.
- Funkcja zaznacz/odznacz wszystkie do masowej akceptacji/odrzucenia.
- Po akceptacji co najmniej 1 fiszki – krok nadania nazwy talii i zapis.
- Odrzucone fiszki nie są zapisywane ani archiwizowane (MVP).

  3.4. Organizacja treści w talie

- Po zakończonej akceptacji użytkownik nadaje nazwę nowej talii.
- Talia zawiera zaakceptowane fiszki.
- Widok listy talii użytkownika z podstawowymi informacjami (nazwa, liczba fiszek).

  3.5. Zarządzanie taliami i fiszkami

- Zmiana nazwy talii.
- Trwałe usuwanie talii z potwierdzeniem (usuwa wszystkie fiszki danej talii).
- Przeglądanie fiszek w talii, edycja i usuwanie pojedynczych fiszek z potwierdzeniem.

  3.6. Ręczne tworzenie fiszek

- Formularz dodania fiszki z polami Pytanie i Odpowiedź.
- Dodawanie do istniejącej talii lub utworzenie nowej talii przy dodawaniu.
- Walidacja pustych pól.

  3.7. Tryb nauki i prosty algorytm powtórek

- Uruchomienie sesji nauki dla wybranej talii.
- Prezentacja pytania (awers); po akcji użytkownika ujawnienie odpowiedzi (rewers).
- Dwa przyciski samooceny: Wiem / Nie wiem.
- Najprostszy algorytm (Leitner 3-pudełkowy):
  - Każda fiszka ma poziom 1–3; start od 1.
  - Wiem: poziom +1 (max 3). Nie wiem: poziom = 1.
  - Harmonogram powtórek według poziomu:
    - Poziom 1: powtórka za 1 dzień.
    - Poziom 2: powtórka za 3 dni.
    - Poziom 3: powtórka za 7 dni.
  - Fiszki due (termin powtórki ≤ teraz) trafiają do sesji; jeśli po stworzeniu talii brak terminów, fiszki są due natychmiast (start nauki możliwy od razu).
  - Kolejność fiszek w sesji może być losowa.
- Zakończenie sesji po wyczerpaniu due fiszek.

  3.8. Onboarding i puste stany

- Nowy użytkownik widzi ekran powitalny z CTA do stworzenia pierwszej talii przez AI.
- Krótkie wskazówki krok po kroku (wklej tekst → generuj → zaakceptuj → nazwij talię → ucz się).

  3.9. Zgłaszanie problemu z fiszką

- Opcja zgłoszenia problemu z fiszką (np. niepoprawna treść).
- Prosty formularz (krótki opis).
- Po wysłaniu – komunikat potwierdzający. Zgłoszenia zapisywane do dalszej analizy (bez panelu administracyjnego w MVP).

  3.10. Ograniczenia i walidacje

- Limit wejścia generacji: 10 000 znaków.
- Limit generacji: 15 na użytkownika na ruchome 24h.
- Nazwa talii wymagana i niepusta.
- Zapis talii możliwy tylko, gdy zaakceptowano ≥ 1 fiszkę.

  3.11. Telemetria i analityka (pod metryki sukcesu)

- Zdarzenia: generacja_ai_start/success/fail, ai_generation_quota_hit, deck_created, card_created_manual, study_session_start/end, study_card_show_answer, study_card_rate_known/unknown, password_reset_requested, signup_success.
- Agregacje: odsetek akceptacji fiszek AI, udział fiszek AI vs manualnych, sesje nauki/tydzień/użytkownika, retencja D7.

## 4. Granice produktu

W zakresie MVP:

- Generowanie fiszek przez AI z tekstu wklejonego (do 10 000 znaków).
- Ręczne tworzenie, edycja i usuwanie fiszek.
- Organizacja w talie, zmiana nazwy i usuwanie talii.
- Prosty algorytm powtórek (Leitner 3 poziomy, interwały 1/3/7 dni).
- Uwierzytelnianie email/hasło (Supabase).
- Zgłaszanie problemów z fiszkami.
- Limit 15 generacji/dobę na użytkownika.

Poza zakresem MVP:

- Własny, zaawansowany algorytm powtórek (np. SM-2).
- Import z plików (PDF, DOCX, itp.).
- Współdzielenie talii, współpraca wielu użytkowników.
- Integracje z zewnętrznymi platformami edukacyjnymi.
- Aplikacje mobilne natywne.
- Przechowywanie odrzuconych fiszek do analizy.
- Panele administracyjne i moderacja treści.

Założenia techniczne i ograniczenia:

- Web wyłącznie; responsywność podstawowa.
- Brak trybu offline.
- Zarządzanie kosztami AI poprzez limity i walidacje.
- Bezpieczeństwo dostępu oparte o RLS i właścicielstwo danych (tylko własne zasoby użytkownika).

## 5. Historyjki użytkowników

US-001  
Tytuł: Rejestracja konta email/hasło  
Opis: Jako nowy użytkownik chcę założyć konto, aby móc tworzyć talie i fiszki.  
Kryteria akceptacji:

- Po podaniu poprawnego emaila i hasła konto zostaje utworzone i użytkownik jest zalogowany.
- Przy błędnym emailu/haśle pojawia się komunikat walidacyjny.
- Hasło jest przechowywane bezpiecznie (Supabase).

US-002  
Tytuł: Logowanie  
Opis: Jako użytkownik chcę się zalogować, aby mieć dostęp do moich talii i fiszek.  
Kryteria akceptacji:

- Poprawne dane logują użytkownika i przekierowują do widoku talii lub ekranu powitalnego.
- Błędne dane skutkują komunikatem o błędzie.
- Sesja jest utrzymywana do wylogowania lub wygaśnięcia.

US-003  
Tytuł: Wylogowanie  
Opis: Jako użytkownik chcę się wylogować, aby zakończyć sesję.  
Kryteria akceptacji:

- Po kliknięciu wyloguj sesja jest unieważniana.
- Użytkownik jest przenoszony do ekranu logowania.

US-004  
Tytuł: Reset hasła  
Opis: Jako użytkownik chcę zresetować hasło przez email.  
Kryteria akceptacji:

- Formularz resetu wysyła email z linkiem.
- Po sukcesie wyświetla się potwierdzenie.
- Błędny email skutkuje komunikatem o błędzie.

US-005  
Tytuł: Ograniczenie dostępu do danych  
Opis: Jako użytkownik chcę, aby tylko ja widział swoje talie i fiszki.  
Kryteria akceptacji:

- Próba dostępu do cudzych zasobów jest blokowana.
- Widoki i API zwracają wyłącznie zasoby zalogowanego użytkownika.
- Testy bezpieczeństwa potwierdzają brak dostępu krzyżowego.

US-006  
Tytuł: Onboarding – pusty stan  
Opis: Jako nowy użytkownik chcę zobaczyć instrukcję i CTA do stworzenia pierwszej talii przez AI.  
Kryteria akceptacji:

- Pusty stan jest widoczny, gdy użytkownik nie ma żadnych talii.
- CTA prowadzi do ekranu generowania AI.
- Po utworzeniu pierwszej talii pusty stan znika.

US-007  
Tytuł: Wklejenie tekstu do generacji (≤10 000 znaków)  
Opis: Jako użytkownik chcę wkleić materiał do pola wejściowego.  
Kryteria akceptacji:

- Licznik znaków aktualizuje się w czasie rzeczywistym.
- Dla ≤10 000 znaków można uruchomić generację.
- Dla >10 000 znaków przycisk generacji jest zablokowany i wyświetla się komunikat.

US-008  
Tytuł: Uruchomienie generacji AI  
Opis: Jako użytkownik chcę wygenerować fiszki z wklejonego tekstu.  
Kryteria akceptacji:

- Kliknięcie Generuj rozpoczyna proces; widoczny jest stan ładowania.
- Po sukcesie widzę listę wygenerowanych fiszek (Pytanie/Odpowiedź).
- Po błędzie widzę komunikat i mogę spróbować ponownie.

US-009  
Tytuł: Limit generacji 15/24h  
Opis: Jako użytkownik nie chcę przekraczać limitu kosztów; po osiągnięciu limitu chcę jasny komunikat.  
Kryteria akceptacji:

- Po osiągnięciu limitu pojawia się informacja o limicie i czasie do resetu.
- Do czasu resetu przycisk generacji jest nieaktywny.
- Widoczny jest licznik wykorzystania (np. 7/15).

US-010  
Tytuł: Przegląd wygenerowanych fiszek  
Opis: Jako użytkownik chcę przeglądać fiszki na liście.  
Kryteria akceptacji:

- Każda fiszka prezentuje Pytanie i Odpowiedź.
- Lista wspiera przewijanie przy dużej liczbie pozycji.
- Brak fiszek po generacji skutkuje komunikatem i możliwością ponownej próby.

US-011  
Tytuł: Edycja wygenerowanej fiszki  
Opis: Jako użytkownik chcę edytować treść Pytania/Odpowiedzi przed akceptacją.  
Kryteria akceptacji:

- Edycja jest możliwa inline lub w modalnym formularzu.
- Walidacja pustych pól blokuje zapis.
- Zmiany są widoczne na liście przed akceptacją.

US-012  
Tytuł: Akceptacja/Odrzucenie pojedynczej fiszki  
Opis: Jako użytkownik chcę oznaczyć fiszkę jako akceptowaną lub odrzuconą.  
Kryteria akceptacji:

- Kliknięcie Akceptuj/Odrzuć zmienia stan fiszki.
- Fiszka odrzucona nie będzie zapisana w systemie po zakończeniu procesu.
- Statusy są czytelnie wyróżnione.

US-013  
Tytuł: Zaznacz/Odznacz wszystkie  
Opis: Jako użytkownik chcę szybko zaznaczyć lub odznaczyć wszystkie fiszki.  
Kryteria akceptacji:

- Przycisk zaznacza wszystkie do akceptacji lub odznacza wszystkie.
- Działa prawidłowo z filtrami i po edycjach.
- Zmiana jest odzwierciedlona w liczniku wybranych fiszek.

US-014  
Tytuł: Zapis zaakceptowanych fiszek jako nowej talii  
Opis: Jako użytkownik chcę nazwać i zapisać talię po akceptacji fiszek.  
Kryteria akceptacji:

- Jeśli zaakceptowano ≥1 fiszkę, pojawia się krok nazwania talii.
- Nazwa jest wymagana (niepusta) i zapisywana.
- Po zapisie pojawia się potwierdzenie i przejście do widoku talii.

US-015  
Tytuł: Brak zaakceptowanych fiszek  
Opis: Jako użytkownik przy braku akceptowanych fiszek nie mogę zapisać talii.  
Kryteria akceptacji:

- Przycisk Zapisz jest nieaktywny przy 0 zaakceptowanych.
- Widoczny jest komunikat z instrukcją akceptacji.
- Możliwość powrotu do edycji/generacji.

US-016  
Tytuł: Widok listy talii  
Opis: Jako użytkownik chcę zobaczyć listę moich talii.  
Kryteria akceptacji:

- Lista pokazuje nazwę i liczbę fiszek każdej talii.
- Kliknięcie talii prowadzi do jej szczegółów.
- Brak talii wyświetla pusty stan z CTA.

US-017  
Tytuł: Zmiana nazwy talii  
Opis: Jako użytkownik chcę zmienić nazwę wybranej talii.  
Kryteria akceptacji:

- Formularz zmiany nazwy waliduje puste wartości.
- Po sukcesie nowa nazwa jest widoczna na liście i w szczegółach.
- Błędy zapisu są komunikowane.

US-018  
Tytuł: Usunięcie talii z potwierdzeniem  
Opis: Jako użytkownik chcę trwale usunąć talię po potwierdzeniu.  
Kryteria akceptacji:

- Akcja wymaga potwierdzenia (okno dialogowe).
- Po usunięciu talia i jej fiszki znikają z listy.
- Operacja jest nieodwracalna (MVP).

US-019  
Tytuł: Podgląd fiszek w talii  
Opis: Jako użytkownik chcę przeglądać fiszki w wybranej talii.  
Kryteria akceptacji:

- Lista fiszek pokazuje pytanie i skrót odpowiedzi.
- Paginacja lub scroll przy większych zestawach.
- Brak fiszek wyświetla pusty stan z CTA dodania.

US-020  
Tytuł: Edycja fiszki w talii  
Opis: Jako użytkownik chcę edytować pytanie/odpowiedź istniejącej fiszki.  
Kryteria akceptacji:

- Edycja waliduje niepuste pola.
- Zmiany są zapisywane i widoczne po odświeżeniu widoku.
- Błąd zapisu jest komunikowany.

US-021  
Tytuł: Usunięcie fiszki  
Opis: Jako użytkownik chcę usunąć fiszkę z talii po potwierdzeniu.  
Kryteria akceptacji:

- Akcja wymaga potwierdzenia.
- Fiszka znika z listy po usunięciu.
- Operacja jest nieodwracalna (MVP).

US-022  
Tytuł: Ręczne dodanie fiszki do istniejącej talii  
Opis: Jako użytkownik chcę dodać nową fiszkę do wybranej talii.  
Kryteria akceptacji:

- Formularz wymaga pytania i odpowiedzi.
- Po sukcesie fiszka pojawia się na liście.
- Błędne lub puste dane blokują zapis.

US-023  
Tytuł: Ręczne utworzenie nowej talii przy dodawaniu fiszki  
Opis: Jako użytkownik chcę utworzyć nową talię i dodać do niej ręczną fiszkę.  
Kryteria akceptacji:

- Formularz umożliwia wprowadzenie nazwy nowej talii.
- Po sukcesie tworzona jest talia i pierwsza fiszka.
- Błędy walidacyjne są komunikowane.

US-024  
Tytuł: Rozpoczęcie sesji nauki  
Opis: Jako użytkownik chcę rozpocząć naukę wybranej talii.  
Kryteria akceptacji:

- Start sesji zawiera wszystkie due fiszki.
- Jeśli to pierwsza sesja nowej talii, wszystkie fiszki są due.
- Widok pokazuje pytanie; odpowiedź jest ukryta do czasu interakcji.

US-025  
Tytuł: Ujawnienie odpowiedzi  
Opis: Jako użytkownik chcę odsłonić odpowiedź po kliknięciu.  
Kryteria akceptacji:

- Kliknięcie pokaż odpowiedź odsłania rewers.
- Po odsłonięciu widoczne są przyciski Wiem / Nie wiem.
- Nawigacja do kolejnej fiszki następuje po ocenie.

US-026  
Tytuł: Ocena Wiem  
Opis: Jako użytkownik chcę oznaczyć fiszkę jako opanowaną.  
Kryteria akceptacji:

- Po Wiem poziom fiszki wzrasta o 1 (max 3).
- Ustalany jest termin kolejnej powtórki zgodnie z poziomem (3 dni dla poziomu 2, 7 dni dla poziomu 3).
- Fiszka nie pojawia się ponownie w bieżącej sesji, jeśli już oceniona.

US-027  
Tytuł: Ocena Nie wiem  
Opis: Jako użytkownik chcę oznaczyć fiszkę jako nieopanowaną.  
Kryteria akceptacji:

- Po Nie wiem poziom fiszki ustawia się na 1.
- Termin kolejnej powtórki to 1 dzień.
- Fiszka nie pojawia się ponownie w bieżącej sesji, jeśli już oceniona.

US-028  
Tytuł: Zakończenie sesji nauki  
Opis: Jako użytkownik chcę jasny koniec sesji, gdy nie ma już due fiszek.  
Kryteria akceptacji:

- Gdy brak due fiszek, widoczny jest ekran zakończenia sesji.
- Ekran zawiera krótkie podsumowanie (liczba fiszek, wyniki Wiem/Nie wiem).
- Dostępne są CTA: powrót do talii lub nauka innej talii.

US-029  
Tytuł: Zgłoszenie problemu z fiszką  
Opis: Jako użytkownik chcę zgłosić problem z konkretną fiszką.  
Kryteria akceptacji:

- Formularz przyjmuje krótki opis.
- Po wysłaniu pojawia się potwierdzenie.
- Zgłoszenie jest zapisywane z identyfikatorem fiszki i czasem.

US-030  
Tytuł: Obsługa błędu generacji AI  
Opis: Jako użytkownik chcę zrozumiały komunikat i możliwość ponowienia po błędzie.  
Kryteria akceptacji:

- W przypadku błędu wyświetla się komunikat z sugestią działania.
- Przycisk spróbuj ponownie jest dostępny.
- Brak utraty już wprowadzonych danych wejściowych.

US-031  
Tytuł: Widoczność wykorzystania limitu AI  
Opis: Jako użytkownik chcę widzieć, ile generacji wykorzystałem.  
Kryteria akceptacji:

- Licznik pokazuje aktualny stan (np. 7/15).
- Po przekroczeniu limitu pojawia się informacja o czasie do resetu.
- Po resecie licznik wraca do 0.

US-032  
Tytuł: Walidacja pól przy edycji/dodawaniu fiszek  
Opis: Jako użytkownik chcę uniknąć zapisania pustych wartości.  
Kryteria akceptacji:

- Puste pytanie lub odpowiedź blokują zapis.
- Komunikat wskazuje brakujące pole.
- Po uzupełnieniu zapis jest możliwy.

US-033  
Tytuł: Usuwanie fiszki z potwierdzeniem  
Opis: Jako użytkownik chcę potwierdzić usunięcie fiszki, aby uniknąć przypadkowej utraty.  
Kryteria akceptacji:

- Dialog potwierdzenia jest wymagany.
- Po potwierdzeniu fiszka znika z listy.
- Operacja nieodwracalna w MVP.

US-034  
Tytuł: Ochrona zasobów API i widoków  
Opis: Jako użytkownik chcę mieć pewność, że inni nie zobaczą moich danych.  
Kryteria akceptacji:

- Zapytania API są filtrowane po użytkowniku (RLS).
- Bez ważnej sesji żądania chronione są odrzucane.
- Testy potwierdzają brak wycieku danych między kontami.

US-035  
Tytuł: Analityka sesji nauki  
Opis: Jako produkt chcę zliczać sesje nauki do metryk zaangażowania.  
Kryteria akceptacji:

- Zdarzenia start i koniec sesji są emitowane.
- Dane pozwalają policzyć liczbę sesji/tydzień/użytkownika.
- Brak danych wrażliwych w eventach.

## 6. Metryki sukcesu

6.1. Jakość generacji AI

- Definicja: odsetek zaakceptowanych fiszek względem wszystkich wygenerowanych przez AI.
- Cel: 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkownika.
- Implementacja: zdarzenia ai_generation_success z liczbą fiszek wygenerowanych i zaakceptowanych; agregacja per użytkownik i globalnie.

  6.2. Adopcja funkcji AI

- Definicja: udział fiszek stworzonych przez AI w stosunku do wszystkich fiszek (AI + manualne).
- Cel: 75% fiszek stworzone z wykorzystaniem AI.
- Implementacja: eventy card_created_manual i deck_created z metadanymi o pochodzeniu fiszek; obliczanie udziału.

  6.3. Zaangażowanie w naukę

- Metryka 1: średnia liczba sesji nauki na użytkownika tygodniowo.
- Metryka 2: retencja 7-dniowa (odsetek użytkowników, którzy wracają w ciągu 7 dni od rejestracji).
- Implementacja: study_session_start/end, powiązanie z datą rejestracji.

  6.4. Dodatkowe wskaźniki operacyjne

- Użycie limitu AI: rozkład dzienny liczników, odsetek użytkowników osiągających limit.
- Stabilność generacji: odsetek udanych generacji vs błędy.
- Czas do pierwszej wartości: czas od rejestracji do utworzenia pierwszej talii i pierwszej sesji nauki.

  6.5. Progi i alerty (rekomendowane)

- Alert przy wzroście błędów generacji AI powyżej ustalonego progu.
- Alert przy spadku odsetka akceptacji fiszek AI poniżej 50% w ujęciu 7-dniowym.
