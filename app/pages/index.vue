<script setup lang="ts">
const { t } = useI18n({
  messages: {
    en: {
      hero: {
        badge: 'Self-hosted — you own your data',
        title: 'Self-service attendance & grading for university classes',
        description: 'Students check themselves in by scanning a QR code — you just review and confirm. Subjects, lessons, attendance and grades, in one teacher dashboard.',
        signin: 'Sign in',
        how: 'How it works',
      },
      demo: {
        subject: 'Programming · Lecture 3',
        scanHint: 'Scan to check in',
        live: 'Live',
        onTime: 'On time',
        late: 'Late',
        student1: 'Anna K.',
        student2: 'Boris M.',
        student3: 'Clara V.',
        attendanceTitle: 'Attendance',
        period: 'Oct — Dec',
        present: 'Present',
        absent: 'Absent',
      },
      features: {
        headline: 'Features',
        title: 'Built around real lessons',
        description: 'Everything a teacher needs to run a course — from the roll call to the final grade sheet.',
        items: {
          subjects: {
            title: 'Subjects & groups',
            description: 'Manage subjects, student groups and subgroups. Track who studies what at a glance.',
          },
          lessons: {
            title: 'Lessons',
            description: 'Generate lessons by count (lectures + practices) or paste a weekly schedule — recurring patterns supported.',
          },
          checkin: {
            title: 'Live check-in',
            description: 'Start a session, students mark themselves in within the on-time and late windows from their phones.',
          },
          attendance: {
            title: 'Attendance grid',
            description: 'A single sortable table of students × lessons. Override any cell, leave a comment, see subgroup splits.',
          },
          grades: {
            title: 'Grades & export',
            description: 'A grading table that mirrors attendance: set scores per lesson, group by section, export the result to Excel.',
          },
          permissions: {
            title: 'Flexible permissions',
            description: 'Assign a teacher to a subject for a specific group, subgroup or lesson type. Permissions stay scoped.',
          },
          auth: {
            title: 'Institutional sign-in',
            description: 'Single sign-on via OIDC. Each teacher sees only the subjects they were granted access to.',
          },
          settings: {
            title: 'Per-subject settings',
            description: 'Tune lesson types, sections and grading rules for each subject independently from a dedicated settings page.',
          },
        },
      },
      how: {
        headline: 'How it works',
        title: 'Three steps replace the roll call',
        description: 'No app installs, no accounts for students. Just a QR code and a link.',
        steps: {
          start: {
            title: 'Start the session',
            description: 'Pick the lesson and set on-time / late windows in minutes. The link and QR code appear instantly.',
          },
          mark: {
            title: 'Students check in',
            description: 'They open the QR or link, find themselves in the list and tap «I\'m here». One device — one mark.',
          },
          confirm: {
            title: 'Confirm and grade',
            description: 'Review who came on time, who was late, then carry the results into the attendance and grades tables.',
          },
        },
      },
      detail_checkin: {
        title: 'QR check-in in seconds',
        description: 'Project the code or share the link. Students scan, tap, and done — their status appears in your dashboard in real time. No registration, no passwords, no friction.',
      },
      detail_attendance: {
        title: 'Attendance grid at a glance',
        description: 'All students and all lessons in one sortable matrix. Green for present, red for absent, yellow for late. Click any cell to override, add a comment, or fix a mistake.',
      },
      faq: {
        headline: 'FAQ',
        title: 'Frequently asked questions',
        description: 'Quick answers to what teachers ask before their first session.',
        items: {
          install: {
            label: 'Do students need to install anything?',
            content: 'No. They just open the QR code or link from their phone browser and tap «I\'m here». No accounts, no app store.',
          },
          late: {
            label: 'How do I handle latecomers?',
            content: 'Each session has two windows — on-time and late. Anyone marking presence after the on-time window is automatically flagged as late, and you can still override the status manually.',
          },
          override: {
            label: 'Can I correct a status after the session?',
            content: 'Yes. Any cell in the attendance grid can be overridden with a status and an optional comment, even days after the lesson.',
          },
          grades: {
            label: 'How do grades work?',
            content: 'Each subject has its own grading table linked to lessons. You can group rows by subgroup, filter by lecture or practice, and export everything to Excel.',
          },
          access: {
            label: 'Who sees which subject?',
            content: 'Access is granted per (subject, group) pair, optionally narrowed to a subgroup or lesson type. Teachers only see the subjects they were assigned to.',
          },
        },
      },
      cta: {
        title: 'Stop calling out names',
        description: 'Sign in with your institution account and run your first session in minutes.',
        action: 'Sign in',
      },
    },
    ru: {
      hero: {
        badge: 'Свой сервер — данные под контролем',
        title: 'Самостоятельная отметка и оценивание студентов',
        description: 'Студенты отмечаются сами — по QR-коду или ссылке. Вы только проверяете и подтверждаете. Предметы, занятия, посещаемость и оценки — в одном кабинете преподавателя.',
        signin: 'Войти',
        how: 'Как это работает',
      },
      demo: {
        subject: 'Программирование · Лекция 3',
        scanHint: 'Отсканируйте для отметки',
        live: 'Активна',
        onTime: 'Вовремя',
        late: 'Опоздал',
        student1: 'Анна К.',
        student2: 'Борис М.',
        student3: 'Клара В.',
        attendanceTitle: 'Посещаемость',
        period: 'Окт — Дек',
        present: 'Присутствовал',
        absent: 'Отсутствовал',
      },
      features: {
        headline: 'Возможности',
        title: 'Заточено под реальные занятия',
        description: 'Всё, что нужно преподавателю — от переклички до итоговой ведомости.',
        items: {
          subjects: {
            title: 'Предметы и группы',
            description: 'Управляйте предметами, группами студентов и подгруппами. Понятно, кто что изучает.',
          },
          lessons: {
            title: 'Занятия',
            description: 'Создавайте занятия по количеству (лекции + практики) или по недельному расписанию — поддерживаются повторяющиеся шаблоны.',
          },
          checkin: {
            title: 'Живая отметка',
            description: 'Запустите сессию — студенты сами отметятся со своих телефонов в основном окне или окне для опоздавших.',
          },
          attendance: {
            title: 'Таблица посещаемости',
            description: 'Студенты × занятия в одной таблице. Можно переопределить любую ячейку, оставить комментарий, видеть разбивку по подгруппам.',
          },
          grades: {
            title: 'Оценки и экспорт',
            description: 'Ведомость оценок построена по аналогии с посещаемостью: баллы по занятиям, группировка по подгруппам, выгрузка в Excel.',
          },
          permissions: {
            title: 'Гибкие права доступа',
            description: 'Преподаватель привязывается к предмету и группе — с уточнением подгруппы или типа занятий, если нужно.',
          },
          auth: {
            title: 'Институциональный вход',
            description: 'Single Sign-On через OIDC. Каждый видит только те предметы, к которым у него есть доступ.',
          },
          settings: {
            title: 'Настройки предмета',
            description: 'Отдельная страница настроек — типы занятий, разбиение на секции и правила оценивания настраиваются под каждый предмет.',
          },
        },
      },
      how: {
        headline: 'Как это работает',
        title: 'Три шага вместо переклички',
        description: 'Студентам не нужно ставить приложение или регистрироваться.',
        steps: {
          start: {
            title: 'Запустить сессию',
            description: 'Выберите занятие и задайте окна «вовремя» и «для опоздавших» в минутах. QR-код и ссылка появляются сразу.',
          },
          mark: {
            title: 'Студенты отмечаются',
            description: 'Открывают QR с проектора или ссылку, ищут себя и жмут «Я здесь». Одно устройство — одна отметка.',
          },
          confirm: {
            title: 'Подтвердить и оценить',
            description: 'Посмотрите, кто пришёл вовремя и кто опоздал, и перенесите результат в таблицы посещаемости и оценок.',
          },
        },
      },
      detail_checkin: {
        title: 'Отметка по QR за секунды',
        description: 'Покажите код на проекторе или отправьте ссылку. Студент сканирует, нажимает — и готово. Статус появляется у вас в кабинете в реальном времени. Никакой регистрации и паролей.',
      },
      detail_attendance: {
        title: 'Таблица посещаемости в одном взгляде',
        description: 'Все студенты и все занятия — в одной сортируемой матрице. Зелёное — присутствовал, красное — отсутствовал, жёлтое — опоздал. Кликните любую ячейку, чтобы переопределить статус или оставить комментарий.',
      },
      faq: {
        headline: 'Вопросы и ответы',
        title: 'Часто задаваемые вопросы',
        description: 'Короткие ответы на то, что преподаватели спрашивают перед первой сессией.',
        items: {
          install: {
            label: 'Нужно ли студентам что-то устанавливать?',
            content: 'Нет. Студент просто открывает QR-код или ссылку в браузере телефона и жмёт «Я здесь». Ни аккаунтов, ни приложений.',
          },
          late: {
            label: 'Что делать с опоздавшими?',
            content: 'У сессии есть два окна — «вовремя» и «для опоздавших». Все, кто отметился после первого окна, автоматически помечаются опоздавшими, и статус всегда можно поправить вручную.',
          },
          override: {
            label: 'Можно ли поправить статус после занятия?',
            content: 'Да. Любую ячейку посещаемости можно переопределить — поставить другой статус и оставить комментарий — даже спустя несколько дней после занятия.',
          },
          grades: {
            label: 'Как устроены оценки?',
            content: 'У каждого предмета своя таблица оценок, привязанная к занятиям. Можно группировать строки по подгруппам, фильтровать по лекциям и практикам и выгружать всё в Excel.',
          },
          access: {
            label: 'Кто какой предмет видит?',
            content: 'Доступ выдаётся на пару (предмет, группа), при необходимости — с уточнением подгруппы или типа занятий. Преподаватель видит только назначенные ему предметы.',
          },
        },
      },
      cta: {
        title: 'Перестаньте делать перекличку',
        description: 'Войдите через институциональный аккаунт и запустите первую сессию за пару минут.',
        action: 'Войти',
      },
    },
  },
})

const features = computed(() => [
  {
    icon: 'i-lucide-book-open',
    title: t('features.items.subjects.title'),
    description: t('features.items.subjects.description'),
  },
  {
    icon: 'i-lucide-calendar',
    title: t('features.items.lessons.title'),
    description: t('features.items.lessons.description'),
  },
  {
    icon: 'i-lucide-qr-code',
    title: t('features.items.checkin.title'),
    description: t('features.items.checkin.description'),
  },
  {
    icon: 'i-lucide-clipboard-check',
    title: t('features.items.attendance.title'),
    description: t('features.items.attendance.description'),
  },
  {
    icon: 'i-lucide-graduation-cap',
    title: t('features.items.grades.title'),
    description: t('features.items.grades.description'),
  },
  {
    icon: 'i-lucide-shield-check',
    title: t('features.items.permissions.title'),
    description: t('features.items.permissions.description'),
  },
  {
    icon: 'i-lucide-lock',
    title: t('features.items.auth.title'),
    description: t('features.items.auth.description'),
  },
  {
    icon: 'i-lucide-settings-2',
    title: t('features.items.settings.title'),
    description: t('features.items.settings.description'),
  },
])

const steps = computed(() => [
  {
    icon: 'i-lucide-play',
    title: t('how.steps.start.title'),
    description: t('how.steps.start.description'),
  },
  {
    icon: 'i-lucide-hand',
    title: t('how.steps.mark.title'),
    description: t('how.steps.mark.description'),
  },
  {
    icon: 'i-lucide-clipboard-check',
    title: t('how.steps.confirm.title'),
    description: t('how.steps.confirm.description'),
  },
])

const faqItems = computed(() => [
  { label: t('faq.items.install.label'), content: t('faq.items.install.content') },
  { label: t('faq.items.late.label'), content: t('faq.items.late.content') },
  { label: t('faq.items.override.label'), content: t('faq.items.override.content') },
  { label: t('faq.items.grades.label'), content: t('faq.items.grades.content') },
  { label: t('faq.items.access.label'), content: t('faq.items.access.content') },
])
</script>

<template>
  <NuxtLayout name="landing">
    <!-- Hero -->
    <UPageHero
      :title="t('hero.title')"
      :description="t('hero.description')"
      orientation="horizontal"
      :links="[{
        label: t('hero.signin'),
        to: '/auth/login',
        icon: 'i-lucide-log-in',
        size: 'xl',
      }, {
        label: t('hero.how'),
        to: '#how',
        icon: 'i-lucide-circle-help',
        size: 'xl',
        color: 'neutral',
        variant: 'subtle',
      }]"
    >
      <template #headline>
        <UBadge color="primary" variant="subtle" size="md" class="mb-4">
          <UIcon name="i-lucide-server" class="size-3.5" />
          {{ t('hero.badge') }}
        </UBadge>
      </template>

      <UPageCard class="w-full" variant="soft" spotlight :ui="{ body: 'p-0' }">
        <div class="p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-radio" class="size-5 text-error animate-pulse" />
              <span class="font-semibold text-sm">{{ t('demo.subject') }}</span>
            </div>
            <UBadge color="success" variant="soft" size="sm">
              {{ t('demo.live') }}
            </UBadge>
          </div>

          <div class="flex flex-col items-center gap-3">
            <div class="bg-white dark:bg-white rounded-xl p-5 shadow-sm">
              <UIcon name="i-lucide-qr-code" class="size-28 text-primary" />
            </div>
            <p class="text-xs text-muted uppercase tracking-wide">
              {{ t('demo.scanHint') }}
            </p>
          </div>
        </div>

        <USeparator />

        <div class="p-5 space-y-2.5">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <UAvatar text="АК" size="2xs" class="bg-primary text-inverted" />
              <span class="text-default">{{ t('demo.student1') }}</span>
            </div>
            <UBadge color="success" variant="subtle" size="xs">
              {{ t('demo.onTime') }}
            </UBadge>
          </div>
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <UAvatar text="БМ" size="2xs" class="bg-secondary text-inverted" />
              <span class="text-default">{{ t('demo.student2') }}</span>
            </div>
            <UBadge color="warning" variant="subtle" size="xs">
              {{ t('demo.late') }}
            </UBadge>
          </div>
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <UAvatar text="КВ" size="2xs" class="bg-info text-inverted" />
              <span class="text-default">{{ t('demo.student3') }}</span>
            </div>
            <UBadge color="success" variant="subtle" size="xs">
              {{ t('demo.onTime') }}
            </UBadge>
          </div>
        </div>
      </UPageCard>
    </UPageHero>

    <!-- Features -->
    <UPageSection
      id="features"
      :headline="t('features.headline')"
      :title="t('features.title')"
      :description="t('features.description')"
    >
      <UPageGrid class="mt-8">
        <UPageCard
          v-for="(feature, i) in features"
          :key="i"
          :icon="feature.icon"
          :title="feature.title"
          :description="feature.description"
          variant="soft"
          spotlight
          class="h-full"
        />
      </UPageGrid>
    </UPageSection>

    <!-- How it works -->
    <UPageSection
      id="how"
      :headline="t('how.headline')"
      :title="t('how.title')"
      :description="t('how.description')"
    >
      <UPageGrid class="mt-8">
        <UPageCard
          v-for="(step, i) in steps"
          :key="i"
          :icon="step.icon"
          :title="`${i + 1}. ${step.title}`"
          :description="step.description"
          variant="subtle"
          highlight
          class="h-full"
        />
      </UPageGrid>
    </UPageSection>

    <!-- Detail: Check-in -->
    <UPageSection
      :title="t('detail_checkin.title')"
      :description="t('detail_checkin.description')"
      orientation="horizontal"
    >
      <UPageCard class="w-full" variant="outline" spotlight>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm">{{ t('demo.subject') }}</span>
            <UBadge color="success" variant="soft" size="sm">
              {{ t('demo.live') }}
            </UBadge>
          </div>

          <div class="flex items-center justify-center">
            <div class="bg-white dark:bg-white rounded-xl p-6 shadow-sm">
              <UIcon name="i-lucide-qr-code" class="size-24 text-primary" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-center text-xs">
            <div class="bg-success/10 text-success rounded-lg p-2 flex items-center justify-center gap-1">
              <UIcon name="i-lucide-check" class="size-3.5" />
              <span>{{ t('demo.onTime') }}</span>
            </div>
            <div class="bg-warning/10 text-warning rounded-lg p-2 flex items-center justify-center gap-1">
              <UIcon name="i-lucide-clock" class="size-3.5" />
              <span>{{ t('demo.late') }}</span>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm px-1">
              <span>{{ t('demo.student1') }}</span>
              <span class="text-success text-xs">12:03</span>
            </div>
            <div class="flex items-center justify-between text-sm px-1">
              <span>{{ t('demo.student2') }}</span>
              <span class="text-warning text-xs">12:18</span>
            </div>
            <div class="flex items-center justify-between text-sm px-1">
              <span>{{ t('demo.student3') }}</span>
              <span class="text-success text-xs">12:01</span>
            </div>
          </div>
        </div>
      </UPageCard>
    </UPageSection>

    <!-- Detail: Attendance -->
    <UPageSection
      :title="t('detail_attendance.title')"
      :description="t('detail_attendance.description')"
      orientation="horizontal"
      reverse
    >
      <UPageCard class="w-full" variant="outline" spotlight>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between text-sm font-medium">
            <span>{{ t('demo.attendanceTitle') }}</span>
            <span class="text-muted">{{ t('demo.period') }}</span>
          </div>

          <div class="grid grid-cols-5 gap-1.5">
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-warning/20 text-warning rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-clock" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-error/20 text-error rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </div>

            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-error/20 text-error rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>

            <div class="bg-warning/20 text-warning rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-clock" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
            <div class="bg-error/20 text-error rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </div>
            <div class="bg-success/20 text-success rounded p-1.5 flex items-center justify-center text-xs">
              <UIcon name="i-lucide-check" class="size-3.5" />
            </div>
          </div>

          <div class="flex items-center gap-3 text-xs text-muted mt-1">
            <div class="flex items-center gap-1">
              <div class="size-2.5 rounded-sm bg-success/20" />
              <span>{{ t('demo.present') }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="size-2.5 rounded-sm bg-warning/20" />
              <span>{{ t('demo.late') }}</span>
            </div>
            <div class="flex items-center gap-1">
              <div class="size-2.5 rounded-sm bg-error/20" />
              <span>{{ t('demo.absent') }}</span>
            </div>
          </div>
        </div>
      </UPageCard>
    </UPageSection>

    <!-- FAQ -->
    <UPageSection
      id="faq"
      :headline="t('faq.headline')"
      :title="t('faq.title')"
      :description="t('faq.description')"
    >
      <UAccordion
        :items="faqItems"
        type="multiple"
        class="mt-8"
      />
    </UPageSection>

    <!-- CTA -->
    <UPageSection>
      <UPageCTA
        :title="t('cta.title')"
        :description="t('cta.description')"
        variant="solid"
        :links="[{
          label: t('cta.action'),
          to: '/auth/login',
          icon: 'i-lucide-log-in',
          color: 'neutral',
          trailingIcon: 'i-lucide-arrow-right',
        }]"
      />
    </UPageSection>
  </NuxtLayout>
</template>
