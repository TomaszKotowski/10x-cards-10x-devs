# Dokument wymagań produktu (PRD) - VibeTravels (MVP)

## 1. Przegląd produktu

VibeTravels to responsywna aplikacja webowa zaprojektowana w celu uproszczenia procesu planowania podróży. Aplikacja wykorzystuje sztuczną inteligencję (AI) do przekształcania podstawowych notatek i preferencji użytkownika w szczegółowe, spersonalizowane plany podróży. Celem wersji MVP (Minimum Viable Product) jest dostarczenie kluczowej funkcjonalności, która pozwoli użytkownikom szybko i bez wysiłku generować, zapisywać i zarządzać planami wycieczek, eliminując trudności związane z samodzielnym wyszukiwaniem atrakcji i planowaniem logistyki.

## 2. Problem użytkownika

Planowanie angażujących i interesujących podróży jest procesem czasochłonnym i często frustrującym. Użytkownicy stają przed wyzwaniem znalezienia odpowiednich atrakcji, efektywnego zorganizowania każdego dnia wycieczki oraz uwzględnienia logistyki, takiej jak transport. Próba połączenia różnych zainteresowań, budżetu i tempa podróży w spójny plan może być przytłaczająca. VibeTravels adresuje ten problem, automatyzując proces planowania i dostarczając gotowe, spersonalizowane plany, co pozwala użytkownikom oszczędzić czas i skupić się na czerpaniu przyjemności z podróży.

## 3. Wymagania funkcjonalne

### 3.1. Zarządzanie kontem i profilem użytkownika

- Użytkownicy muszą mieć możliwość założenia konta i logowania się.
- Każdy użytkownik posiada swój profil, w którym może zdefiniować i zaktualizować swoje preferencje podróżnicze.
- Po rejestracji uruchamiany jest krótki proces onboardingu w celu zebrania podstawowych preferencji, z możliwością jego pominięcia.

### 3.2. Preferencje użytkownika

Preferencje, które można zdefiniować, obejmują:

- Budżet: (jednokrotny wybór) Budżetowo, Standardowo, Bez limitu.
- Zainteresowania: (wielokrotny wybór) np. Historia, Sztuka, Przyroda, Rozrywka.
- Rodzaj kuchni: (wielokrotny wybór) np. Włoska, Azjatycka, Wegetariańska.
- Tempo podróży: (jednokrotny wybór) Wolne, Standardowe, Intensywne.
- Preferowany transport: (wielokrotny wybór) np. Głównie pieszo/komunikacja miejska, Samochód.

### 3.3. Generator Planów AI

- Główna funkcja aplikacji, która generuje plan podróży na podstawie danych wejściowych.
- Dane wejściowe to formularz zawierający: Miasto, Daty, Liczba osób.
- Użytkownik może dodać opcjonalne pole tekstowe (Notatki dla AI) w celu sprecyzowania swoich oczekiwań.
- Generator uwzględnia preferencje zapisane w profilu użytkownika.

### 3.4. Wyświetlanie i zarządzanie planami

- Wygenerowane plany są prezentowane w formacie "dzień po dniu".
- Plan zawiera listę atrakcji, szacunkowe czasy transportu oraz oznaczenia "płatne/darmowe".
- Każdy plan zawiera informację o orientacyjnym charakterze danych.
- Użytkownicy mogą zapisywać, przeglądać, edytować i usuwać swoje plany.
- Zapisane plany są dostępne na ekranie głównym (dashboard) w formie chronologicznej listy.
- Nazwy planów są generowane automatycznie, z możliwością późniejszej edycji.

### 3.5. Interfejs użytkownika i doświadczenie

- Aplikacja musi być responsywna (RWD), działająca na urządzeniach mobilnych i desktopowych.
- Dashboard po zalogowaniu wyświetla listę planów lub, w przypadku jej braku, wyraźne wezwanie do działania w celu stworzenia pierwszej podróży.
- W przypadku błędu generowania planu, użytkownik otrzymuje czytelny i przyjazny komunikat.
- Mają być spełnione podstowowe wymagania WCAG

### 3.6. System zbierania opinii

- Pod każdym wygenerowanym planem znajduje się prosty system oceny (kciuk w górę / kciuk w dół).
- Użytkownik ma możliwość dodania opcjonalnego komentarza do swojej oceny.

## 4. Granice produktu

### W zakresie MVP:

- Prosty system tworzenia kont użytkowników (rejestracja, logowanie).
- Profil użytkownika z możliwością zapisania i edycji preferencji podróżniczych.
- Generator planów podróży oparty o model LLM, wykorzystujący dane z formularza, notatki i preferencje użytkownika.
- Funkcjonalność CRUD (Create, Read, Update, Delete) dla planów podróży (zapisywanie, przeglądanie, edycja nazwy, usuwanie).
- Responsywny interfejs webowy.
- Podstawowa analityka do mierzenia kryteriów sukcesu.
- System zbierania opinii o planach (ocena i komentarz).

### Poza zakresem MVP:

- Współdzielenie planów podróży między użytkownikami.
- Integracja z zewnętrznymi API (np. Google Maps, systemy rezerwacji biletów/hoteli).
- Zaawansowane planowanie logistyki (rezerwacje, dokładne czasy przejazdów w czasie rzeczywistym).
- Obsługa i analiza multimediów (np. wgrywanie zdjęć).
- Funkcje społecznościowe (np. komentowanie planów innych użytkowników, system znajomych).

## 5. Historyjki użytkowników

### Zarządzanie kontem i Onboarding

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto za pomocą adresu e-mail i hasła, aby móc zapisywać swoje plany podróży i preferencje.
- Kryteria akceptacji:
  - Formularz rejestracji zawiera pola na e-mail i hasło (z potwierdzeniem).
  - System waliduje poprawność formatu adresu e-mail.
  - System wymaga bezpiecznego hasła (np. min. 8 znaków).
  - Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany i przekierowany do procesu onboardingu.
  - W przypadku, gdy e-mail jest już zajęty, wyświetlany jest odpowiedni komunikat błędu.

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby uzyskać dostęp do moich zapisanych planów i preferencji.
- Kryteria akceptacji:
  - Formularz logowania zawiera pola na e-mail i hasło.
  - Po pomyślnym zalogowaniu, użytkownik jest przekierowany na swój panel główny (dashboard).
  - W przypadku podania błędnych danych, wyświetlany jest komunikat "Nieprawidłowy e-mail lub hasło".
  - Użytkownik pozostaje zalogowany podczas trwania sesji.

- ID: US-003
- Tytuł: Przejście procesu onboardingu
- Opis: Jako nowy użytkownik, po pierwszej rejestracji, chcę przejść przez krótki proces konfiguracji, aby ustawić swoje podstawowe preferencje podróżnicze.
- Kryteria akceptacji:
  - Onboarding składa się z 2-3 kroków.
  - Każdy krok pozwala na ustawienie jednej lub kilku preferencji (Budżet, Zainteresowania, Tempo itp.).
  - Użytkownik może zapisać preferencje na ostatnim kroku.
  - Po zakończeniu onboardingu użytkownik jest przekierowany na dashboard.

- ID: US-004
- Tytuł: Pominięcie procesu onboardingu
- Opis: Jako nowy użytkownik, chcę mieć możliwość pominięcia procesu onboardingu, aby szybciej przejść do aplikacji.
- Kryteria akceptacji:
  - Na każdym kroku onboardingu widoczny jest przycisk lub link "Pomiń".
  - Kliknięcie go przenosi użytkownika bezpośrednio na dashboard.
  - Pominięcie onboardingu nie zapisuje żadnych preferencji.

### Zarządzanie profilem

- ID: US-005
- Tytuł: Zarządzanie preferencjami w profilu
- Opis: Jako zalogowany użytkownik, chcę mieć dostęp do strony profilu, gdzie mogę przeglądać i edytować moje zapisane preferencje podróżnicze.
- Kryteria akceptacji:
  - W aplikacji jest dostępna sekcja "Profil".
  - W profilu wyświetlane są wszystkie kategorie preferencji z aktualnie zapisanymi wartościami.
  - Użytkownik może zmienić każdą z preferencji (Budżet, Zainteresowania, etc.).
  - Zmiany muszą być zatwierdzone przyciskiem "Zapisz".
  - Po zapisaniu zmian, system wyświetla potwierdzenie.

### Generowanie i Zarządzanie Planami Podróży

- ID: US-006
- Tytuł: Tworzenie nowego planu podróży
- Opis: Jako zalogowany użytkownik, chcę wypełnić prosty formularz, aby wygenerować nowy plan podróży dostosowany do moich potrzeb.
- Kryteria akceptacji:
  - Formularz zawiera pola: "Miasto" (tekst), "Daty" (wybór zakresu), "Liczba osób" (liczba).
  - Formularz zawiera opcjonalne pole tekstowe "Notatki dla AI".
  - Po kliknięciu "Generuj plan", system komunikuje, że proces jest w toku (np. loader).
  - Po pomyślnym wygenerowaniu, użytkownik widzi ekran ze szczegółami nowego planu.
  - Plan jest automatycznie zapisywany na liście planów użytkownika.

- ID: US-007
- Tytuł: Wyświetlanie pustego dashboardu
- Opis: Jako nowy użytkownik, który nie stworzył jeszcze żadnego planu, po zalogowaniu chcę zobaczyć na dashboardzie zachętę do stworzenia pierwszej podróży.
- Kryteria akceptacji:
  - Jeśli lista planów użytkownika jest pusta, dashboard wyświetla specjalny komunikat (np. "Nie masz jeszcze żadnych planów. Stwórz swój pierwszy!").
  - Na ekranie widoczny jest wyraźny przycisk "Stwórz nowy plan", który przenosi do formularza generowania.

- ID: US-008
- Tytuł: Przeglądanie listy zapisanych planów
- Opis: Jako użytkownik, który ma już zapisane plany, chcę widzieć ich listę na moim dashboardzie, aby móc łatwo do nich wrócić.
- Kryteria akceptacji:
  - Dashboard wyświetla listę wszystkich zapisanych planów.
  - Lista jest posortowana chronologicznie (od najnowszej daty podróży).
  - Każdy element na liście zawiera nazwę planu (np. "Wycieczka do Rzymu"), daty i miasto.
  - Kliknięcie na element listy przenosi do widoku szczegółowego danego planu.

- ID: US-009
- Tytuł: Wyświetlanie szczegółów planu podróży
- Opis: Jako użytkownik, chcę móc wyświetlić szczegóły wygenerowanego planu, aby zapoznać się z proponowanymi atrakcjami i harmonogramem.
- Kryteria akceptacji:
  - Widok szczegółowy prezentuje plan w podziale na dni.
  - Dla każdego dnia wyświetlana jest lista atrakcji.
  - Każda atrakcja ma oznaczenie "płatna" lub "darmowa".
  - Między atrakcjami widoczne są szacunkowe czasy transportu.
  - Pod całym planem znajduje się disclaimer o orientacyjnym charakterze danych.
  - Na stronie widoczny jest mechanizm oceny planu (kciuki).

- ID: US-010
- Tytuł: Edycja nazwy planu podróży
- Opis: Jako użytkownik, chcę mieć możliwość zmiany automatycznie wygenerowanej nazwy mojego planu na własną, aby łatwiej go identyfikować.
- Kryteria akceptacji:
  - W widoku listy planów lub w widoku szczegółowym znajduje się opcja edycji nazwy.
  - Użytkownik może wprowadzić nową nazwę i ją zapisać.
  - Nowa nazwa jest widoczna na liście planów i w widoku szczegółowym.

- ID: US-011
- Tytuł: Usuwanie planu podróży
- Opis: Jako użytkownik, chcę mieć możliwość usunięcia planu, którego już nie potrzebuję, aby utrzymać porządek na mojej liście.
- Kryteria akceptacji:
  - Na liście planów lub w widoku szczegółowym znajduje się opcja "Usuń".
  - Przed ostatecznym usunięciem system wyświetla modal z prośbą o potwierdzenie ("Czy na pewno chcesz usunąć ten plan?").
  - Po potwierdzeniu, plan jest trwale usuwany z konta użytkownika, a użytkownik wraca do dashboardu.

- ID: US-012
- Tytuł: Obsługa błędu generowania planu
- Opis: Jako użytkownik, w przypadku gdy AI nie uda się wygenerować planu, chcę zobaczyć zrozumiały komunikat o błędzie i sugestię, co robić dalej.
- Kryteria akceptacji:
  - Jeśli proces generowania planu zakończy się niepowodzeniem, zamiast planu wyświetlany jest komunikat błędu.
  - Komunikat jest przyjazny (np. "Niestety, nie udało się wygenerować planu. Spróbuj ponownie później lub zmień zapytanie.").
  - Użytkownik ma możliwość łatwego powrotu do formularza, aby spróbować ponownie.

### Zbieranie opinii

- ID: US-013
- Tytuł: Ocena wygenerowanego planu
- Opis: Jako użytkownik, chcę móc ocenić wygenerowany plan za pomocą przycisków "kciuk w górę" lub "kciuk w dół", aby przekazać swoją opinię o jego jakości.
- Kryteria akceptacji:
  - Pod każdym planem znajdują się dwie klikalne ikony: kciuk w górę i kciuk w dół.
  - Użytkownik może wybrać tylko jedną z opcji.
  - Po kliknięciu, wybór jest zapisywany w systemie, a interfejs wizualnie potwierdza oddanie głosu (np. podświetlenie ikony).

- ID: US-014
- Tytuł: Dodawanie komentarza do oceny
- Opis: Jako użytkownik, po ocenieniu planu, chcę mieć możliwość dodania opcjonalnego komentarza, aby przekazać bardziej szczegółowe uwagi.
- Kryteria akceptacji:
  - Po kliknięciu na kciuk w górę/dół pojawia się pole tekstowe do wpisania komentarza.
  - Użytkownik może wpisać tekst i go przesłać.
  - Przesłanie komentarza jest opcjonalne.
  - Po wysłaniu komentarza system wyświetla potwierdzenie (np. "Dziękujemy za Twoją opinię!").

## 6. Metryki sukcesu

### Cele główne

- Zaangażowanie użytkowników: 75% aktywnych użytkowników generuje 3 lub więcej planów wycieczek w ciągu roku.
- Adopcja profilu: 90% zarejestrowanych użytkowników posiada w pełni wypełnione preferencje turystyczne w swoim profilu.

### Wskaźniki krótkoterminowe

- Aktywacja użytkowników: Wysoki odsetek (do zdefiniowania, np. >50%) nowo zarejestrowanych użytkowników generuje swój pierwszy plan w ciągu 7 dni od rejestracji.

### Metryki jakościowe

- Pętla informacji zwrotnej: Cotygodniowy, manualny przegląd ocen (👍/👎) i komentarzy pozostawionych przez użytkowników. Celem jest identyfikacja wzorców i słabych punktów w generowanych planach w celu iteracyjnego ulepszania promptów AI.
