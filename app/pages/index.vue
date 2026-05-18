<script setup lang="ts">
const { t } = useI18n({
  messages: {
    en: {
      hero: {
        title: 'Self-service attendance for university classes',
        description: 'Students check themselves in by scanning a QR code or opening a link — you just review and confirm. Subjects, lessons and attendance in one teacher dashboard.',
        signin: 'Sign in',
        how: 'How it works',
      },
      features: {
        title: 'Built around real lessons',
        description: 'Subjects, groups, lessons and attendance — plus the live check-in flow tying it all together.',
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
          permissions: {
            title: 'Flexible assignments',
            description: 'Assign a teacher to a subject for a specific group, subgroup or lesson type. Permissions stay scoped.',
          },
          auth: {
            title: 'Institutional sign-in',
            description: 'Single sign-on via OIDC. Each teacher sees only the subjects they were granted access to.',
          },
        },
      },
      how: {
        title: 'How check-in works',
        description: 'Three steps replace the roll call. No app installs, no accounts for students.',
        steps: {
          start: {
            title: 'Start the session',
            description: 'Pick the lesson and set on-time / late windows in minutes. The link and QR code appear instantly.',
          },
          mark: {
            title: 'Students check in',
            description: 'They open the QR or link, find themselves in the list and tap «I\'m here». One device — one check-in.',
          },
          confirm: {
            title: 'Confirm the results',
            description: 'Review who came on time, who was late, change statuses or add a comment, then move it to the main attendance table.',
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
        title: 'Самостоятельная отметка студентов на занятии',
        description: 'Студенты отмечаются сами — по QR-коду или ссылке. Вы только проверяете и подтверждаете. Предметы, занятия и посещаемость — в одном кабинете преподавателя.',
        signin: 'Войти',
        how: 'Как это работает',
      },
      features: {
        title: 'Заточено под реальные занятия',
        description: 'Предметы, группы, занятия и посещаемость — плюс живой check-in, который связывает всё вместе.',
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
            title: 'Live check-in',
            description: 'Запустите сессию — студенты сами отметятся со своих телефонов в основном окне или окне для опоздавших.',
          },
          attendance: {
            title: 'Таблица посещаемости',
            description: 'Студенты × занятия в одной таблице. Можно переопределить любую ячейку, оставить комментарий, видеть разбивку по подгруппам.',
          },
          permissions: {
            title: 'Гибкие назначения',
            description: 'Преподаватель привязывается к предмету и группе — с уточнением подгруппы или типа занятий, если нужно.',
          },
          auth: {
            title: 'Институциональный вход',
            description: 'Single Sign-On через OIDC. Каждый видит только те предметы, к которым у него есть доступ.',
          },
        },
      },
      how: {
        title: 'Как работает check-in',
        description: 'Три шага вместо переклички. Студентам не нужно ставить приложение или регистрироваться.',
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
            title: 'Подтвердить результаты',
            description: 'Видно, кто пришёл вовремя, кто опоздал. При желании поменяйте статус или оставьте комментарий и перенесите в основную посещаемость.',
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
    icon: 'i-lucide-clipboard-list',
    title: t('features.items.checkin.title'),
    description: t('features.items.checkin.description'),
  },
  {
    icon: 'i-lucide-clipboard-check',
    title: t('features.items.attendance.title'),
    description: t('features.items.attendance.description'),
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
</script>

<template>
  <NuxtLayout name="landing">
    <UPageHero
      :title="t('hero.title')"
      :description="t('hero.description')"
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
    />

    <UPageSection
      id="features"
      :title="t('features.title')"
      :description="t('features.description')"
      :features="features"
    />

    <UPageSection
      id="how"
      :title="t('how.title')"
      :description="t('how.description')"
    >
      <UPageGrid>
        <UPageCard
          v-for="(step, i) in steps"
          :key="i"
          :icon="step.icon"
          :title="`${i + 1}. ${step.title}`"
          :description="step.description"
        />
      </UPageGrid>
    </UPageSection>

    <UPageSection>
      <UPageCTA
        :title="t('cta.title')"
        :description="t('cta.description')"
        variant="subtle"
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
